import * as _ from 'lodash';
import THREE from '../libs/three.extensions';
import * as BAS from '../libs/bas';

export default class AnimationMesh extends THREE.Mesh {
  get time() {
    return this.material.uniforms['uTime'].value;
  }
  set time(v) {
    this.material.uniforms['uTime'].value = v;
  }

  constructor(shaderOptions, prefabGeometry) {
    // the number of times the prefabGeometry will be repeated
    const animationPhase = 'in';

    const box = new THREE.Box3().setFromObject(new THREE.Mesh(prefabGeometry, new THREE.MeshNormalMaterial()));
    const width = box.getSize().x;
    const height = box.getSize().y;

    // duplicate some vertices so that each face becomes a separate triangle.
    // this is the same as the THREE.ExplodeModifier
    BAS.Utils.separateFaces(prefabGeometry);

    // create a ModelBufferGeometry based on the geometry created above
    // ModelBufferGeometry makes it easier to create animations based on faces of a geometry
    // it is similar to the PrefabBufferGeometry where the prefab is a face (triangle)
    const geometry = new BAS.ModelBufferGeometry(prefabGeometry, {
      // setting this to true will store the vertex positions relative to the face they are in
      // this way it's easier to rotate and scale faces around their own center
      localizeFaces: true,
      // setting this to true will store a centroid for each face in an array
      computeCentroids: true
    });

    // buffer UVs so the textures are mapped correctly
    geometry.bufferUvs();

    let i, j, offset, centroid;

    const aDelayDuration = geometry.createAttribute('aDelayDuration', 2);
    // these will be used to calculate the animation delay and duration for each face
    const minDuration = 0.8;
    const maxDuration = 1.2;
    const maxDelayX = 0.9;
    const maxDelayY = 0.125;
    const stretch = 0.11;

    const totalDuration = maxDuration + maxDelayX + maxDelayY + stretch;

    for (i = 0, offset = 0; i < geometry.faceCount; i++) {
      centroid = geometry.centroids[i];

      const duration = THREE.Math.randFloat(minDuration, maxDuration);
      // delay is based on the position of each face within the original plane geometry
      // because the faces are localized, this position is available in the centroids array
      const delayX = THREE.Math.mapLinear(centroid.x, -width * 0.5, width * 0.5, 0.0, maxDelayX);
      let delayY;

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
    geometry.createAttribute('aStartPosition', 3, (data, i) => {
      geometry.centroids[i].toArray(data);
    });
    geometry.createAttribute('aEndPosition', 3, (data, i) => {
      geometry.centroids[i].toArray(data);
    });

    // CONTROL POINTS

    // each face will follow a bezier path
    // since all paths begin and end on the position (the centroid), the control points will determine how the animation looks
    const aControl0 = geometry.createAttribute('aControl0', 3);
    const aControl1 = geometry.createAttribute('aControl1', 3);

    const control0 = new THREE.Vector3();
    const control1 = new THREE.Vector3();
    const data = [];

    for (i = 0, offset = 0; i < geometry.faceCount; i++) {
      centroid = geometry.centroids[i];

      // the logic to determine the control points is completely arbitrary
      const signY = Math.sign(centroid.y);

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

    // BAS.StandardAnimationMaterial uses the data in the buffer geometry to calculate the animation state
    // this calculation is performed in the vertex shader
    // BAS.StandardAnimationMaterial uses THREE.js shader chunks to duplicate the THREE.MeshStandardMaterial
    // the shader is then 'extended' by injecting our own chunks at specific points
    // BAS also extends THREE.MeshPhongMaterial and THREE.MeshBasicMaterial in the same way


    const texture = new THREE.Texture();
    texture.minFilter = THREE.NearestFilter;
    const materialOptions = {
      vertexColors: THREE.VertexColors,
      // material parameters/flags go here
      flatShading: true,
      transparent: true,
      // custom uniform definitions
      uniforms: {
        // uTime is updated every frame, and is used to calculate the current animation state
        // this is the only value that changes, which is the reason we can animate so many objects at the same time
        uTime: { value: 0 },
        needSplash: 1,
        textureImage: null,
      },
      // uniform *values* of the material we are extending go here
      uniformValues: {
        map: texture,
        needSplash: 1,
        textureImage: new THREE.TextureLoader().load('logo.svg'),
        canvasResolution: {
          x: window.innerWidth,
          y: window.innerHeight,
        },
        metalness: 0.5,
        roughness: 0.5
      },
      ...shaderOptions,
    };

    const initialOptions = { ...materialOptions };
    const material = new BAS.StandardAnimationMaterial(materialOptions);

    super(geometry, material);

    this.totalDuration = totalDuration;
    this.materialOptions = initialOptions;

    this.sizes = {
      width,
      height
    };

    // it's usually a good idea to set frustum culling to false because
    // the bounding box does not reflect the dimensions of the whole object in the scene
    this.frustumCulled = false;
  }

  resetMaterial(options = {}) {
    const material = new BAS.StandardAnimationMaterial(_.merge({
      ...this.materialOptions
    }, options));

    this.material = material;
    this.material.needsUpdate = true;
  }
}