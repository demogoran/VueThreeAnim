import { TimelineMax, Power0 } from 'gsap';
import THREE from '../libs/three.extensions';
import THREERoot from '../libs/root';
import AnimationMesh from './animation.mesh';

export default class Main {
  constructor(shaderOptions = {}, container) {
    const root = new THREERoot({
      fov: 80,
      createCameraControls: false,
      container,
    });
    root.renderer.setClearColor('black');
    root.camera.position.set(0, 0, 30);

    /* var light = new THREE.DirectionalLight();
    light.position.set(0, 0, 3); */
    const light = new THREE.AmbientLight(0xffffff, 4);
    root.scene.add(light);

    this.root = root;
    this.shaderOptions = shaderOptions;
    this.meshes = {};
  }

  addAnimationMesh(name = Date.now(), prefabGeometry, duration = 7.0) {
    // Animation extends THREE.Mesh
    const animationMesh = new AnimationMesh(this.shaderOptions, prefabGeometry);
    this.root.add(animationMesh);
    this.meshes[name] = animationMesh;


    const tl = new TimelineMax({
      repeat: 0,
    });

    /* tl.to(animationMesh, duration * .75, {
      time: animationMesh.totalDuration,
      repeat: 0, yoyo: true,
      ease: Power0.easeIn,
      onComplete() {

      }
    }); */

    this.tl = tl;

    return animationMesh;
  }

  removeMesh(name) {
    const mesh = this.meshes[name];
    if (!mesh) return;

    this.root.scene.remove(mesh);
    delete this.meshes[name];
  }

  removeAllMeshes() {
    Object.keys(this.meshes).forEach(x => this.root.scene.remove(this.meshes[x]));
    this.meshes = {};
  }

  restartAnimation() {
    this.tl.restart();
  }
}