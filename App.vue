<template>
  <div id="content">
    <div id="app" ref="container"></div>
    <div id="controls">
      <textarea
        name="vertexPosition"
        id="vertexPosition"
        cols="30"
        rows="10"
        v-model="vertexPosition"
      ></textarea>

      <audio id="playTrack" autoplay controls :src="trackSrc" ref="audio" />

      <div class="button" @click="applyChanges()">Change</div>
      <div class="button" @click="setCurrentText('Test')">Text test</div>
      <div class="button" @click="startPlay()">Start Play</div>
    </div>
  </div>
</template>

<style>
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
}
canvas {
  width: 100% !important;
  height: 100% !important;
}
#controls {
  position: absolute;
  top: 0;
  right: 0;
  width: 330px;
  height: 100%;
  background: #eaeaead9;
  overflow-y: scroll;
}
.button {
  cursor: pointer;
  width: 150px;
  height: 30px;
  background: #caffca;
  line-height: 30px;
  text-align: center;
}
#controls .button {
  margin-bottom: 10px;
}
#app {
  width: calc(100% - 330px);
  float: left;
}
</style>

<script>
import parseSRT from "parse-srt";
import * as _ from "lodash";

import THREE from "./libs/three.extensions";
import Main from "./js/index.js";
import { AnimationOptions } from "./js/animation.options";

export default {
  data() {
    return {
      vertexPosition: `
        transformed *= tProgress;
        transformed += cubicBezier(aStartPosition,
            aControl0,
            aControl1,
            aEndPosition,
            tProgress);
      `.trim(),
      trackSrc: "",
      srtJSON: {},
      srtPrevIndex: -1,
      loadedFont: null,
      mainMesh: null,
      main: null
    };
  },

  methods: {
    applyChanges() {
      this.mainMesh.resetMaterial({
        vertexPosition: [this.vertexPosition]
      });
      // this.main.restartAnimation(); //used to restart GSock animation
    },

    onTrackPlaying() {
      if (!this.$refs.audio) {
        requestAnimationFrame(this.onTrackPlaying);
        return;
      }
      const currentTime = this.$refs.audio.currentTime;
      const currentElem = _.find(
        this.srtJSON,
        x => x.start <= currentTime && x.end >= currentTime
      );

      if (!currentElem) {
        requestAnimationFrame(this.onTrackPlaying);
        return;
      }

      const srtCurrIndex = currentElem.id;
      if (this.srtPrevIndex !== srtCurrIndex) {
        this.setCurrentText(
          currentElem.text,
          currentElem.end - currentElem.start
        );
        this.srtPrevIndex = srtCurrIndex;
      }

      const diff = currentTime - currentElem.start;
      const duration = (currentElem.end - currentElem.start) * 0.75;

      this.mainMesh.time = (this.mainMesh.totalDuration / duration) * diff;
      requestAnimationFrame(this.onTrackPlaying);
    },

    async startPlay() {
      const srt = await fetch("legends.srt").then(x => x.text());
      this.srtJSON = parseSRT(srt);
      this.trackSrc = "legends.mp3";
    },

    setCurrentText(text, duration) {
      this.main.removeAllMeshes();

      this.mainMesh = this.main.addAnimationMesh(
        "current",
        new THREE.TextGeometry(text, {
          font: this.loadedFont,
          size: 5,
          height: 0,
          style: "normal",
          bevelSize: 1,
          bevelThickness: 0.03,
          bevelEnabled: false,
          anchor: { x: 0.5, y: 0.0, z: 0.5 }
        }),
        duration
      );

      const trajectoryList = [
        `
        float scl = tProgress * 2.0 - 0.5;
        transformed *= scl * scl;
        transformed +=
          cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);
        `,
        `
        float scl = tProgress * 2.0 - 0.7;
        transformed *= easeQuadOut(scl);
        transformed += easeQuadOut(tProgress) * aEndPosition;
        `,
        `
        float scl = tProgress * 2.0 - 0.9;
        transformed *= scl * scl;
        transformed +=
          cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);
        `,
        `
        float scl = tProgress * 2.0 - 0.7;
        transformed *= easeQuadOut(scl);
        transformed +=
          cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);
        `
      ];

      const randomTrajectory =
        trajectoryList[Math.round(Math.random() * trajectoryList.length + 1)];
      if (randomTrajectory) {
        this.mainMesh.resetMaterial({
          vertexPosition: randomTrajectory
        });
      }

      const camera = this.main.root.camera;

      camera.lookAt(this.mainMesh.position);
      this.mainMesh.position.x -= this.mainMesh.sizes.width / 4;
      camera.position.z = 150;
      // this.main.restartAnimation(); //Could be used in case you could like to use GSock
    }
  },

  mounted() {
    this.main = new Main(AnimationOptions, this.$refs.container);
    const loader = new THREE.FontLoader();
    loader.load("fonts/helvetiker_regular.typeface.json", font => {
      this.loadedFont = font;
      this.startPlay();
    });

    this.onTrackPlaying();
  }
};
</script>
