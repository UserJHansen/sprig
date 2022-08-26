import { bitmapTextToImageData } from "./bitmap.js";

// const spritesheetIndex = 0;
// const texIndex = 1;
// let gl,              texLocation,
//                   texResLocation,
//              spritesheetLocation,
//     spritesheetTileCountLocation;

const SPRITESHEET_TILE_COUNT = 64;

export function setBitmaps(bitmaps) {
  const sw = 16 * SPRITESHEET_TILE_COUNT;
  const sh = 16 * SPRITESHEET_TILE_COUNT;
  const spritesheet = new ImageData(sw, sh);
  for (let i = 0; i < bitmaps.length; i++) {
    const { data } = bitmapTextToImageData(bitmaps[i][1]);
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 16; y++) {
        const sx = (          (i % SPRITESHEET_TILE_COUNT))*16 + x;
        const sy = (Math.floor(i / SPRITESHEET_TILE_COUNT))*16 + y;
        spritesheet.data[(sy*sw + sx)*4 + 0] = data[(y*16 + x)*4 + 0];
        spritesheet.data[(sy*sw + sx)*4 + 1] = data[(y*16 + x)*4 + 1];
        spritesheet.data[(sy*sw + sx)*4 + 2] = data[(y*16 + x)*4 + 2];
        spritesheet.data[(sy*sw + sx)*4 + 3] = data[(y*16 + x)*4 + 3];
      }
  }

  uniforms.u_spritesheet.value.source.data = spritesheet;
  uniforms.u_spritesheet.value.flipY = false;
  uniforms.u_spritesheet.value.magFilter = THREE.NearestFilter;
  uniforms.u_spritesheet.value.minFilter = THREE.NearestFilter;
  uniforms.u_spritesheet.value.source.needsUpdate = true;
  uniforms.u_spritesheet.value       .needsUpdate = true;
}

const uniforms = {
  u_tex                    : { value: new THREE.Texture(new ImageData(1, 1)) },
  u_spritesheet            : { value: new THREE.Texture(new ImageData(1, 1)) },
  u_spritesheet_tile_count : { value: SPRITESHEET_TILE_COUNT },
  u_texres                 : { value: [0, 0] },
};

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
let camera, cube;


export function init(canvas) {
  /* slurp all we need out this mf then delete */
  canvas.parentElement.appendChild( renderer.domElement );
  const { width, height } = canvas.parentElement.getBoundingClientRect()
  canvas.remove();

  renderer.setSize(width, height);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

  const geometry = new THREE.BoxGeometry( 3, 3, 3 );
  const material = new THREE.ShaderMaterial( {
    uniforms,
    vertexShader: glsl['shader-vertex'],
    fragmentShader: glsl['shader-fragment'],

    // vertexShader: `
    // varying vec2 vUv;

    // void main(void) {
    //   vUv = uv;
    //   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    // }`,

    // fragmentShader: `
    // uniform sampler2D map;

    // varying vec2 vUv;

    // void main(void) {
    //   gl_FragColor = texture2D(map, vUv);
    //   // gl_FragColor = vec4(vUv, 0, 1);
    // }
    // `
  } );

  cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  camera.position.z = 5;
}

export function resize(canvas) {
  // renderer.setSize(canvas.width, height);
}

export function render(canvas) {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  uniforms.u_texres.value = [canvas.width, canvas.height];
  uniforms.u_tex.value.source.data = canvas;
  uniforms.u_tex.value.magFilter = THREE.NearestFilter;
  uniforms.u_tex.value.minFilter = THREE.NearestFilter;
  uniforms.u_tex.value.flipY = false;
  uniforms.u_tex.value.source.needsUpdate = true;
  uniforms.u_tex.value       .needsUpdate = true;

  renderer.render( scene, camera );
}

const glsl = {
  'shader-fragment': `
uniform sampler2D u_tex;
uniform sampler2D u_spritesheet;
uniform int u_spritesheet_tile_count;
uniform vec2 u_texres;
in vec2 texCoord;

vec4 sampleTile(vec2 coord, float index) {
  // this index is sometimes wrong because of floating point math
  // if it's low this should trigger
  if (index - trunc(index) > 0.001) index = index + 0.0001;

  int spriteIndex = int(index*255.0)-1;
  vec2 fcoord = mod(coord*u_texres, 1.0);
  fcoord += vec2(spriteIndex % u_spritesheet_tile_count,
                 spriteIndex / u_spritesheet_tile_count);
  vec4 ret = texture(u_spritesheet, fcoord/float(u_spritesheet_tile_count));
  ret.a *= min(1.0, index);
  return ret;
}

void main(void) {
  vec2 coord = vec2(texCoord.x, 1.0 - texCoord.y);
  vec4 raw = texture(u_tex, coord);

  // gl_FragColor = vec4(texture(u_tex, coord).rgb * 255.0f, 1); // vec4(1);
  gl_FragColor = vec4(1);
  vec4 sprite;
  sprite = sampleTile(coord, raw.a); 
  if (sprite.a > 0.0) gl_FragColor = vec4(sprite.xyz, 1);
  sprite = sampleTile(coord, raw.b); 
  if (sprite.a > 0.0) gl_FragColor = vec4(sprite.xyz, 1);
  sprite = sampleTile(coord, raw.g); 
  if (sprite.a > 0.0) gl_FragColor = vec4(sprite.xyz, 1);
  sprite = sampleTile(coord, raw.r); 
  if (sprite.a > 0.0) gl_FragColor = vec4(sprite.xyz, 1);

}
  `,
  'shader-vertex': `
out vec2 texCoord;

void main(void) {
  texCoord = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
  `,
};

