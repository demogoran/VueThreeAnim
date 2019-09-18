import * as THREE from 'three';
import { TimelineMax, Power0 } from 'gsap';
import * as BAS from './bas';
import THREERoot from '../libs/root';



class ExplosionAnimation extends THREE.Mesh {
    get time() {
        return this.material.uniforms['uTime'].value;
    }
    set time(v) {
        this.material.uniforms['uTime'].value = v;
    }

    get uBackColor() {
        return this.material.uniforms['uBackColor'].value;
    }
    set uBackColor(v) {
        this.material.uniforms['uBackColor'].value = v;
    }


    constructor() {
        const animationPhase = 'in';
        var cSize = 30;
        var sizes = [480, 720];
        var plane = new THREE.PlaneGeometry(cSize, cSize * sizes[1] / sizes[0], 100, 100);
        const meshObj = new THREE.Mesh(plane, new THREE.MeshNormalMaterial());

        const boundingBox = plane.computeBoundingBox();
        const { min, max } = plane.boundingBox;

        var width = max.x - min.x + 100;
        var height = max.z - min.z;
        // create a geometry that will be used by BAS.ModelBufferGeometry
        // its a plane with a bunch of segments
        //var plane = new THREE.planeGeometry(width, height, width * 2, height * 2);

        // duplicate some vertices so that each face becomes a separate triangle.
        // this is the same as the THREE.ExplodeModifier
        BAS.Utils.separateFaces(plane);

        // create a ModelBufferGeometry based on the geometry created above
        // ModelBufferGeometry makes it easier to create animations based on faces of a geometry
        // it is similar to the PrefabBufferGeometry where the prefab is a face (triangle)
        var geometry = new BAS.ModelBufferGeometry(plane, {
            // setting this to true will store the vertex positions relative to the face they are in
            // this way it's easier to rotate and scale faces around their own center
            localizeFaces: true,
            // setting this to true will store a centroid for each face in an array
            computeCentroids: true
        });


        var i, j, offset, centroid;

        // ANIMATION

        var aDelayDuration = geometry.createAttribute('aDelayDuration', 2);
        // these will be used to calculate the animation delay and duration for each face
        var minDuration = 0.8;
        var maxDuration = 1.2;
        var maxDelayX = 0.9;
        var maxDelayY = 0.125;
        var stretch = 0.11;

        const totalDuration = maxDuration + maxDelayX + maxDelayY + stretch;

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
        /*var maxCoords={
          x: Math.max(...aStartPosition.array.filter((x,i)=>i%3===0)),
          y: Math.max(...aStartPosition.array.filter((x,i)=>i%3===1)),
          z: Math.max(...aStartPosition.array.filter((x,i)=>i%3===2)),
        }
        console.log(maxCoords);*/
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

        var material = new BAS.BasicAnimationMaterial({
            shading: THREE.FlatShading,
            side: THREE.DoubleSide,
            uniforms: {
                canvasResolution: {},
                uTime: { value: 0 },
                uBackColor: { value: new THREE.Color().setHSL(0, 1.0, 0.5) }
            },
            uniformValues: {
                map: new THREE.TextureLoader().load('models/ravversus.jpg'),
                canvasResolution: {
                    x: window.innerWidth,
                    y: window.innerHeight,
                },
                //diffuse: new THREE.Color(0xFF00FF11)
            },
            vertexFunctions: [
                BAS.ShaderChunk['cubic_bezier'],
                BAS.ShaderChunk['ease_cubic_in_out'],
                BAS.ShaderChunk['quaternion_rotation']
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
                //`transformed+=vec3(aStartPosition.x, aStartPosition.y, aStartPosition.z);`
                /*`transformed += cubicBezier(aStartPosition,
                vec3(aControl0.x, aControl0.y, aControl0.z*2.0),
                vec3(aControl1.x, aControl1.y, aControl1.z*2.0),
                aEndPosition, tProgress);`*/
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
                    //diffuseColor = texture2D(map, uv);
                    diffuseColor = vec4(1.0, 1.0, 1.0, 1.0);
                `
            ]
        });


        super(plane, material);

        this.totalDuration = totalDuration;
        this.frustumCulled = false;
        this.time = 1;
    }
}

export default class Main {
    constructor() {
        var root = new THREERoot({
            createCameraControls: true,
            antialias: (window.devicePixelRatio === 1),
            fov: 60
        });

        root.renderer.setClearColor(0x222222);
        root.camera.position.set(0, 0, 400);

        // add lights
        var light = new THREE.DirectionalLight(0xff00ff);
        root.add(light);

        light = new THREE.DirectionalLight(0x00ffff);
        light.position.y = -1;
        root.add(light);

        this.root = root;
    }

    setAnimation(explosionAnimation) {
        const duration = 6.0;
        const tl = new TimelineMax({
            repeat: -1,
            repeatDelay: 0.5,
            yoyo: true
        });
        tl.to(explosionAnimation, duration, {
            time: explosionAnimation.totalDuration,
            ease: Power0.easeIn
        }, 0);


        //return { geometry, material };
    }

    addObjects() {
        //const { geometry, material } = this.prepareAnimation();
        //geometry.bufferUVs();

        const explosionAnimation = new ExplosionAnimation();

        const pivot = new THREE.Object3D();
        pivot.position.y = 0;
        pivot.add(explosionAnimation);
        this.root.scene.add(pivot);

        this.setAnimation(explosionAnimation);
    }
}