window.onload = init;

var recorder;
var timeline = new TimelineMax({
  repeat: 0, repeatDelay: 0.0, yoyo: false, onUpdate: () => {
    //console.log('Updating');
  },
  onComplete: () => {
    console.log("Done");
    recorder.stop();
  }
});


function startCapturing() {
  var stream = document.querySelector('#three-container canvas').captureStream(30);
  recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm'
  });
  recorder.addEventListener('dataavailable', function (e) {
    var videoData = [e.data];
    var blob = new Blob(videoData, { 'type': 'video/webm' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = Date.now() + '.webm';
    a.click();
    window.URL.revokeObjectURL(url);
    /*var reader = new FileReader;
    reader.onload = function() {
        window.open(this.result.replace(/data:.+?\/[^;]+/, "data:application/octet-stream"));
    };
    reader.readAsDataURL(blob);
    console.log(blob);*/
  });

  recorder.start();
}

function init() {
  var root = new THREERoot({
    fov: 80,
    createCameraControls: false
  });
  //root.renderer.setClearColor('#969696');
  root.renderer.setClearColor('black');
  root.camera.position.set(0, 0, 30);

  var light = new THREE.DirectionalLight();
  light.position.set(0, 0, 1);
  root.scene.add(light);

  var width = 100;
  var height = 60;


  startCapturing();


  var totalTime = 10;
  var duration = 2;
  var loader = new THREE.FontLoader();
  loader.load('fonts/georgia.js', (font) => {
    var geometry = new THREE.TextGeometry("Ravado Studio", {
      size: 5,
      height: 0,
      font: font,
      weight: 'bold',
      style: 'normal',
      bevelSize: 1,
      bevelThickness: 0.03,
      bevelEnabled: false,
      anchor: { x: 0.5, y: 0.0, z: 0.5 }
    });
    var animation = new Slide(geometry, "in", new THREE.Color("rgba(255, 255, 0, 0.5)"));
    animation.position.x = -21;
    animation.position.y = 10;
    window.anim = animation;
    root.add(animation);


    //timeline.add(TweenMax.fromTo(animation, 5, { time: 0.0 }, { time: 2, delay: 0, ease: Power0.easeInOut }), totalTime*2-3);

    //var tl = new TimelineMax({ repeat: 0, repeatDelay: 0.0, delay: 2, yoyo: false });
    //tl.add(animation.transition(7.5, 3), 0);
  });


  var cSize = 30;
  var sizes = [480, 720];
  var animation = new ObjAnim(new THREE.PlaneGeometry(cSize, cSize * sizes[1] / sizes[0], 100, 100), "in", new THREE.Color("white"));
  console.log(animation);
  //var animation = new ObjAnim(new THREE.CubeGeometry(cSize, cSize*1.921708185053381, cSize, 50, 50), "in", new THREE.Color("white"));
  //animation.position.x = -27;
  //animation.position.y = 130;

  window.pivot = new THREE.Object3D();
  pivot.position.y = 0;
  pivot.add(animation);

  //obj.rotateY(180/180*Math.PI);
  //pivot.rotateY(90/180*Math.PI);
  /*var tl = new TimelineMax({ repeat: -1, repeatDelay: 0.0, yoyo: true });
  tl.add(TweenMax.fromTo(material.uniforms.time, 1.0, { value: 0.0 }, { value: .5, ease: Power0.easeInOut }), 0);
  */

  //root.add(animation);
  /*var tl = new TimelineMax({ repeat: 0, repeatDelay: 0.0, yoyo: false, onUpdate: ()=>console.log(1) });
  tl.add(animation.transition(5, 1.57), 0);*/

  timeline.add(TweenMax.fromTo(animation, totalTime, { time: 0.0 }, { time: duration, ease: Power0.easeInOut }), 0);
  /*timeline.add(TweenMax.fromTo(animation.rotation, totalTime-duration, { x: 0.0 }, { x: 360/180*Math.PI, ease: Power0.easeInOut }), duration);
  timeline.add(TweenMax.fromTo(animation, totalTime, { time: duration}, { time: 0.0, ease: Power0.easeInOut }), totalTime-1);
  timeline.add(function(){animation.material.uniforms['needSplash'].value=0;}, totalTime*2-3)
  timeline.add(TweenMax.fromTo(animation, 3, { time: 0.0}, { time: duration, ease: Power0.easeInOut }), totalTime*2-3);*/
  root.add(pivot);
}

////////////////////
// CLASSES
////////////////////

function Slide(plane, animationPhase, uBackColor) {
  var box = new THREE.Box3().setFromObject(new THREE.Mesh(plane, new THREE.MeshNormalMaterial()));
  var width = box.size().x + 100;
  var height = box.size().y;
  // create a geometry that will be used by THREE.BAS.ModelBufferGeometry
  // its a plane with a bunch of segments
  //var plane = new THREE.PlaneGeometry(width, height, width * 2, height * 2);

  // duplicate some vertices so that each face becomes a separate triangle.
  // this is the same as the THREE.ExplodeModifier
  THREE.BAS.Utils.separateFaces(plane);

  // create a ModelBufferGeometry based on the geometry created above
  // ModelBufferGeometry makes it easier to create animations based on faces of a geometry
  // it is similar to the PrefabBufferGeometry where the prefab is a face (triangle)
  var geometry = new THREE.BAS.ModelBufferGeometry(plane, {
    // setting this to true will store the vertex positions relative to the face they are in
    // this way it's easier to rotate and scale faces around their own center
    localizeFaces: true,
    // setting this to true will store a centroid for each face in an array
    computeCentroids: true
  });

  // buffer UVs so the textures are mapped correctly
  geometry.bufferUVs();

  var i, j, offset, centroid;

  // ANIMATION

  var aDelayDuration = geometry.createAttribute('aDelayDuration', 2);
  // these will be used to calculate the animation delay and duration for each face
  var minDuration = 0.8;
  var maxDuration = 1.2;
  var maxDelayX = 0.9;
  var maxDelayY = 0.125;
  var stretch = 0.11;

  this.totalDuration = maxDuration + maxDelayX + maxDelayY + stretch;

  for (i = 0, offset = 0; i < geometry.faceCount; i++) {
    centroid = geometry.centroids[i];

    var duration = THREE.Math.randFloat(minDuration, maxDuration);
    // delay is based on the position of each face within the original plane geometry
    // because the faces are localized, this position is available in the centroids array
    var delayX = THREE.Math.mapLinear(centroid.x, -width * 0.5, width * 0.5, 0.0, maxDelayX);
    var delayY;

    // create a different delayY mapping based on the animation phase (in or out)
    if (animationPhase === 'in') {
      delayY = THREE.Math.mapLinear(Math.abs(centroid.y), 0, height * 0.5, 0.0, maxDelayY)
    }
    else {
      delayY = THREE.Math.mapLinear(Math.abs(centroid.y), 0, height * 0.5, maxDelayY, 0.0)
    }

    // store the delay and duration FOR EACH VERTEX of the face
    for (j = 0; j < 3; j++) {
      // by giving each VERTEX a different delay value the face will be 'stretched' in time
      aDelayDuration.array[offset] = delayX + delayY + (Math.random() * stretch * duration);
      aDelayDuration.array[offset + 1] = duration;

      offset += 2;
    }
  }

  // POSITIONS

  // the transitions will begin and end on the same position
  var aStartPosition = geometry.createAttribute('aStartPosition', 3, function (data, i) {
    geometry.centroids[i].toArray(data);
  });

  var aEndPosition = geometry.createAttribute('aEndPosition', 3, function (data, i) {
    geometry.centroids[i].toArray(data);
  });

  // CONTROL POINTS

  // each face will follow a bezier path
  // since all paths begin and end on the position (the centroid), the control points will determine how the animation looks
  var aControl0 = geometry.createAttribute('aControl0', 3);
  var aControl1 = geometry.createAttribute('aControl1', 3);

  var control0 = new THREE.Vector3();
  var control1 = new THREE.Vector3();
  var data = [];

  for (i = 0, offset = 0; i < geometry.faceCount; i++) {
    centroid = geometry.centroids[i];

    // the logic to determine the control points is completely arbitrary
    var signY = Math.sign(centroid.y);

    control0.x = THREE.Math.randFloat(0.1, 0.3) * 50;
    control0.y = signY * THREE.Math.randFloat(0.1, 0.3) * 70;
    control0.z = THREE.Math.randFloatSpread(20);

    control1.x = THREE.Math.randFloat(0.3, 0.6) * 150;
    control1.y = -signY * THREE.Math.randFloat(0.3, 0.6) * 70;
    control1.z = THREE.Math.randFloatSpread(-150);

    if (animationPhase === 'in') {
      control0.subVectors(centroid, control0);
      control1.subVectors(centroid, control1);
    }
    else { // out
      control0.addVectors(centroid, control0);
      control1.addVectors(centroid, control1);
    }

    // store the control points per face
    // this is similar to THREE.PrefabBufferGeometry.setPrefabData
    geometry.setFaceData(aControl0, i, control0.toArray(data));
    geometry.setFaceData(aControl1, i, control1.toArray(data));
  }

  var texture = new THREE.Texture();
  texture.minFilter = THREE.NearestFilter;

  var _canvas = document.querySelector('#three-container canvas');
  var material = new THREE.BAS.BasicAnimationMaterial({
    shading: THREE.FlatShading,
    side: THREE.DoubleSide,
    uniforms: {
      canvasResolution: {},
      uTime: { value: 0 },
      uBackColor: { value: uBackColor || new THREE.Color().setHSL(0, 1.0, 0.5) }
    },
    uniformValues: {
      map: new THREE.TextureLoader().load('models/ravversus.jpg'),
      canvasResolution: {
        x: _canvas.clientWidth,
        y: _canvas.clientHeight,
      },
    },
    vertexFunctions: [
      THREE.BAS.ShaderChunk['cubic_bezier'],
      THREE.BAS.ShaderChunk['ease_cubic_in_out'],
      THREE.BAS.ShaderChunk['quaternion_rotation']
    ],
    vertexParameters: [
      'uniform float uTime;',
      'uniform vec2 canvasResolution;',
      'attribute vec2 aDelayDuration;',
      'attribute vec3 aStartPosition;',
      'attribute vec3 aControl0;',
      'attribute vec3 aControl1;',
      'attribute vec3 aEndPosition;',
      'vec3 aStartPos;'
    ],
    vertexInit: [
      'float tProgress = clamp(uTime - aDelayDuration.x, 0.0, aDelayDuration.y) / aDelayDuration.y;',
      'aStartPos=aStartPosition;'
    ],
    vertexPosition: [
      // this scales each face
      // for the in animation, we want to go from 0.0 to 1.0
      // for the out animation, we want to go from 1.0 to 0.0
      (animationPhase === 'in' ? 'transformed *= tProgress;' : 'transformed *= 1.0 - tProgress;'),
      // translation based on the bezier curve defined by the attributes
      `transformed+=vec3(aStartPosition.x, aStartPosition.y, aStartPosition.z);`
    ],
    fragmentParameters: [
      'uniform float uTime;',
      'uniform vec3 uBackColor;',
      'uniform vec2 canvasResolution;',
      'vec3 aStartPos;'
    ],
    fragmentMap: [
      `
        vec2 uv = gl_FragCoord.xy / canvasResolution.xy;
        diffuseColor = vec4(1.0, 1.0, 1.0, 1.0);
      `
    ]
  });

  THREE.Mesh.call(this, geometry, material);

  this.frustumCulled = false;
}
Slide.prototype = Object.create(THREE.Mesh.prototype);
Slide.prototype.constructor = Slide;
Object.defineProperty(Slide.prototype, 'time', {
  get: function () {
    return this.material.uniforms['uTime'].value;
  },
  set: function (v) {
    this.material.uniforms['uTime'].value = v;
  }
});

Object.defineProperty(Slide.prototype, 'backFaceColor', {
  get: function () {
    return this.material.uniforms['uBackColor'].value;
  },
  set: function (v) {
    this.material.uniforms['uBackColor'].value = v;
  }
});

Slide.prototype.setImage = function (image) {
  this.material.uniforms.map.value.image = image;
  this.material.uniforms.map.value.needsUpdate = true;
};

Slide.prototype.transition = function (totalTime, duration) {
  //return TweenMax.fromTo(this, duration, { time: 0.0 }, { time: duration, ease: Power0.easeInOut });
  return TweenMax.fromTo(this, totalTime || 5.0, { time: 0.0 }, { time: duration || this.totalDuration, ease: Power0.easeInOut });
};





function ObjAnim(plane, animationPhase, uBackColor) {
  var box = new THREE.Box3().setFromObject(new THREE.Mesh(plane, new THREE.MeshNormalMaterial()));
  var width = box.size().x + 100;
  var height = box.size().y;
  // create a geometry that will be used by THREE.BAS.ModelBufferGeometry
  // its a plane with a bunch of segments
  //var plane = new THREE.PlaneGeometry(width, height, width * 2, height * 2);

  // duplicate some vertices so that each face becomes a separate triangle.
  // this is the same as the THREE.ExplodeModifier
  THREE.BAS.Utils.separateFaces(plane);

  // create a ModelBufferGeometry based on the geometry created above
  // ModelBufferGeometry makes it easier to create animations based on faces of a geometry
  // it is similar to the PrefabBufferGeometry where the prefab is a face (triangle)
  var geometry = new THREE.BAS.ModelBufferGeometry(plane, {
    // setting this to true will store the vertex positions relative to the face they are in
    // this way it's easier to rotate and scale faces around their own center
    localizeFaces: true,
    // setting this to true will store a centroid for each face in an array
    computeCentroids: true
  });


  // buffer UVs so the textures are mapped correctly
  geometry.bufferUVs();

  var i, j, offset, centroid;

  // ANIMATION

  var aDelayDuration = geometry.createAttribute('aDelayDuration', 2);
  var aDelayDuration = geometry.createAttribute('aDelayDuration', 2);
  vecData = geometry.createAttribute('vecData', 3);
  // these will be used to calculate the animation delay and duration for each face
  var minDuration = 0.8;
  var maxDuration = 1.2;
  var maxDelayX = 0.9;
  var maxDelayY = 0.125;
  var stretch = 0.11;

  this.totalDuration = maxDuration + maxDelayX + maxDelayY + stretch;

  var dataOffset = 0;
  for (i = 0, offset = 0; i < geometry.faceCount; i++) {
    /*vecData.array[dataOffset]=
    vecData.array[dataOffset+1]=
    vecData.array[dataOffset+2]=0;
    dataOffset+=3;*/
    centroid = geometry.centroids[i];

    var duration = THREE.Math.randFloat(minDuration, maxDuration);
    // delay is based on the position of each face within the original plane geometry
    // because the faces are localized, this position is available in the centroids array
    var delayX = THREE.Math.mapLinear(centroid.x, -width * 0.5, width * 0.5, 0.0, maxDelayX);
    var delayY;

    // create a different delayY mapping based on the animation phase (in or out)
    if (animationPhase === 'in') {
      delayY = THREE.Math.mapLinear(Math.abs(centroid.y), 0, height * 0.5, 0.0, maxDelayY)
    }
    else {
      delayY = THREE.Math.mapLinear(Math.abs(centroid.y), 0, height * 0.5, maxDelayY, 0.0)
    }

    // store the delay and duration FOR EACH VERTEX of the face
    for (j = 0; j < 3; j++) {
      // by giving each VERTEX a different delay value the face will be 'stretched' in time
      aDelayDuration.array[offset] = delayX + delayY + (Math.random() * stretch * duration);
      aDelayDuration.array[offset + 1] = duration;

      offset += 2;
    }
  }

  // POSITIONS

  // the transitions will begin and end on the same position
  var aStartPosition = geometry.createAttribute('aStartPosition', 3, function (data, i) {
    geometry.centroids[i].toArray(data);
  });
  var aEndPosition = geometry.createAttribute('aEndPosition', 3, function (data, i) {
    geometry.centroids[i].toArray(data);
  });

  // CONTROL POINTS

  // each face will follow a bezier path
  // since all paths begin and end on the position (the centroid), the control points will determine how the animation looks
  var aControl0 = geometry.createAttribute('aControl0', 3);
  var aControl1 = geometry.createAttribute('aControl1', 3);

  var control0 = new THREE.Vector3();
  var control1 = new THREE.Vector3();
  var data = [];

  for (i = 0, offset = 0; i < geometry.faceCount; i++) {
    centroid = geometry.centroids[i];

    // the logic to determine the control points is completely arbitrary
    var signY = Math.sign(centroid.y);

    control0.x = THREE.Math.randFloat(0.1, 0.3) * -10;
    control0.y = signY * THREE.Math.randFloat(0.1, 0.3) * 0;
    control0.z = THREE.Math.randFloatSpread(50);

    control1.x = THREE.Math.randFloat(0.3, 0.6) * -10;
    control1.y = -signY * THREE.Math.randFloat(0.3, 0.6) * 0;
    control1.z = THREE.Math.randFloatSpread(-50);

    if (animationPhase === 'in') {
      control0.subVectors(centroid, control0);
      control1.subVectors(centroid, control1);
    }
    else { // out
      control0.addVectors(centroid, control0);
      control1.addVectors(centroid, control1);
    }

    // store the control points per face
    // this is similar to THREE.PrefabBufferGeometry.setPrefabData
    geometry.setFaceData(aControl0, i, control0.toArray(data));
    geometry.setFaceData(aControl1, i, control1.toArray(data));
  }
  upGeometry = geometry;

  var texture = new THREE.Texture();
  texture.minFilter = THREE.NearestFilter;

  var material = new THREE.BAS.BasicAnimationMaterial({
    shading: THREE.FlatShading,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {
      midPoint: {},
      uTime: { value: 0 },
      textureImage: null,
      uBackColor: { value: uBackColor || new THREE.Color().setHSL(0, 1.0, 0.5) }
    },
    uniformValues: {
      map: texture,
      textureImage: new THREE.TextureLoader().load('models/ravversus.jpg'),
      //diffuse: new THREE.Color(0xFF00FF11)
    },
    vertexFunctions: [
      THREE.BAS.ShaderChunk['cubic_bezier'],
      THREE.BAS.ShaderChunk['ease_cubic_in_out'],
      THREE.BAS.ShaderChunk['quaternion_rotation']
    ],
    vertexParameters: [
      'uniform float uTime;',
      'uniform vec3 midPoint;',
      'uniform float needSplash;',
      'attribute vec3 vecData;',
      'uniform sampler2D textureImage;',
      'vec3 vecDataF;',
      'vec3 aStartPositionF;',
      'float tProgress;',
      'attribute vec2 aDelayDuration;',
      'attribute vec3 aStartPosition;',
      'attribute vec3 aControl0;',
      'attribute vec3 aControl1;',
      'attribute vec3 aEndPosition;'
    ],
    vertexInit: [
      'tProgress = clamp(uTime - aDelayDuration.x, 0.0, aDelayDuration.y) / aDelayDuration.y;'
    ],
    vertexPosition: [
      // this scales each face
      // for the in animation, we want to go from 0.0 to 1.0
      // for the out animation, we want to go from 1.0 to 0.0

      (animationPhase === 'in' ? 'transformed *= tProgress;' : 'transformed *= 1.0 - tProgress;'),

      `
        float multiplier=5.0;
        /*transformed += vec3(aEndPosition.x+cos(tProgress)*multiplier,
        aEndPosition.y+sin(tProgress)*multiplier,
        aEndPosition.z+tProgress*multiplier);*/

        float radius=20.0;
        float rotationsNum=2.0;
        transformed += vec3(aStartPosition.x-radius*cos(2.0*PI*tProgress*rotationsNum)+radius,
        aStartPosition.y,
        aStartPosition.z+radius*sin(2.0*PI*tProgress*rotationsNum));
      `,
      // translation based on the bezier curve defined by the attributes
      //'transformed += cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);',
      'if(needSplash>0.0)',
      'transformed += cubicBezier(aStartPosition, midPoint, midPoint, aEndPosition, tProgress);'

      //'transformed+=aStartPosition*tProgress;'
    ],
    fragmentParameters: [
      'uniform float uTime;',
      'vec3 vecDataF;',
      'vec3 aStartPositionF;',
      'uniform sampler2D textureImage;',
      'float tProgress;',
    ],
    fragmentMap: [
      //'gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',
      //'diffuseColor = vec4(vUv[0], vUv[1], vUv[1], 1.0);'
      `
        diffuseColor = texture2D(textureImage, vUv);
      `
      //'diffuseColor = vec4(1.0, 0.9, 1.0, 1.0);'
      //'diffuseColor = vec4(uBackColor, 1.0);'
    ]
  });

  var middle = new THREE.Vector3();
  geometry.computeBoundingBox();

  middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
  middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
  middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;
  console.log(material.uniforms);
  material.uniforms['midPoint'].value = middle;
  THREE.Mesh.call(this, geometry, material);

  this.frustumCulled = false;
}
ObjAnim.prototype = Object.create(THREE.Mesh.prototype);
ObjAnim.prototype.constructor = ObjAnim;
Object.defineProperty(ObjAnim.prototype, 'time', {
  get: function () {
    return this.material.uniforms['uTime'].value;
  },
  set: function (v) {
    this.material.uniforms['uTime'].value = v;
  }
});

Object.defineProperty(ObjAnim.prototype, 'backFaceColor', {
  get: function () {
    return this.material.uniforms['uBackColor'].value;
  },
  set: function (v) {
    this.material.uniforms['uBackColor'].value = v;
  }
});

ObjAnim.prototype.setImage = function (image) {
  this.material.uniforms.map.value.image = image;
  this.material.uniforms.map.value.needsUpdate = true;
};

ObjAnim.prototype.transition = function (totalTime, duration) {
  return [
    TweenMax.fromTo(this, totalTime || 5.0, { time: 0.0 }, { time: duration || this.totalDuration, ease: Power0.easeInOut }),
    TweenMax.fromTo(this.rotation, totalTime || 5.0, { y: 0.0 }, { y: 90 / 180 * Math.PI })];
};