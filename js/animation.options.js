import * as BAS from '../libs/bas';
export const AnimationOptions = {
    // BAS has a number of functions that can be reused. They can be injected here.
    vertexFunctions: [
        // Penner easing functions easeCubicInOut and easeQuadOut (see the easing example for all available functions)
        BAS.ShaderChunk['ease_cubic_in_out'],
        BAS.ShaderChunk['ease_quad_out'],
        BAS.ShaderChunk['ease_back_in'],
        BAS.ShaderChunk['ease_elastic_in_out'],

        BAS.ShaderChunk['quaternion_rotation'],
        BAS.ShaderChunk['cubic_bezier'],
        BAS.ShaderChunk['ease_out_cubic']
    ],
    // parameter  must match uniforms and attributes defined above in both name and type
    // as a convention, I prefix uniforms with 'u' and attributes with 'a' (and constants with 'c', varyings with 'v', and temps with 't')
    vertexParameters: [
        'uniform float uTime;',
        'uniform vec3 midPoint;',
        'uniform float needSplash;',
        'attribute vec2 aDelayDuration;',
        'attribute vec3 aStartPosition;',
        'attribute vec3 aEndPosition;',
        'attribute vec4 aAxisAngle;',
        'attribute vec3 aControl0;',
        'attribute vec3 aControl1;',
        'varying float tProgress;'
    ],
    // this chunk is injected 1st thing in the vertex shader main() function
    // variables declared here are available in all subsequent chunks
    vertexInit: [
        'float tDelay = aDelayDuration.x;',
        'float tDuration = aDelayDuration.y;',
        'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
        //'float tProgress = ease(tTime, 0.0, 1.0, tDuration);',
        'tProgress = tTime / tDuration;'
        //'float tProgress = clamp(uTime - aDelayDuration.x, 0.0, aDelayDuration.y) / aDelayDuration.y;',
    ],
    // this chunk is injected before all default position calculations (including the model matrix multiplication)
    vertexPosition: [
        //(true ? 'transformed *= tProgress;' : 'transformed *= 1.0 - tProgress;'),
        /* 'transformed *= tProgress;',
        //'transformed *= 1.0 - tProgress;',
        // translation based on the bezier curve defined by the attributes
        `transformed += cubicBezier(aStartPosition,
            aControl0,
            aControl1,
            aEndPosition,
            tProgress);`, */
        `float scl = tProgress * 2.0 - 0.5;
        transformed *= scl * scl;
        transformed += cubicBezier(aStartPosition, aControl0, aControl1, aEndPosition, tProgress);`
    ],
    fragmentParameters: [
        'vec3 vecDataF;',
        'vec3 aStartPositionF;',
        'uniform sampler2D textureImage;',
        'uniform vec2 canvasResolution;',
        'varying float tProgress;'
    ],
    fragmentMap: [
        `
        vec2 uv = gl_FragCoord.xy / canvasResolution.xy;
        float dist = 1.0;
        diffuseColor = vec4(.5, uv.x, tProgress, 1.0);
        `
        //'diffuseColor = texture2D(textureImage, vUv);'
        //'diffuseColor = texture2D(textureImage, vUv);'
    ]
};