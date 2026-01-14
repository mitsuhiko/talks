#!/usr/bin/env node
// Injects the WebGL dithered video backdrop into the Marp HTML output

const fs = require('fs');

const htmlFile = process.argv[2] || 'me-and-the-machine.html';
let html = fs.readFileSync(htmlFile, 'utf-8');

const backdropScript = `
<style>
  #backdrop-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    pointer-events: none;
  }
</style>
<canvas id="backdrop-canvas"></canvas>
<script>
(function() {
  const canvas = document.getElementById('backdrop-canvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const vsSource = \`
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_texCoord = a_texCoord;
    }
  \`;

  const fsSource = \`
    precision highp float;
    uniform sampler2D u_video;
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;

    const vec3 dark = vec3(0.888, 0.747, 0.561);
    const vec3 light = vec3(1.0, 1.0, 1.0);

    float atkinsonThreshold(vec2 pos) {
      int x = int(mod(pos.x, 4.0));
      int y = int(mod(pos.y, 4.0));
      int idx = y * 4 + x;
      float thresholds[16];
      thresholds[0] = 0.0;    thresholds[1] = 12.0;  thresholds[2] = 3.0;   thresholds[3] = 15.0;
      thresholds[4] = 8.0;   thresholds[5] = 4.0;   thresholds[6] = 11.0;  thresholds[7] = 7.0;
      thresholds[8] = 2.0;   thresholds[9] = 14.0;  thresholds[10] = 1.0;  thresholds[11] = 13.0;
      thresholds[12] = 10.0; thresholds[13] = 6.0;  thresholds[14] = 9.0;  thresholds[15] = 5.0;
      for (int i = 0; i < 16; i++) {
        if (i == idx) return thresholds[i] / 16.0;
      }
      return 0.0;
    }

    void main() {
      vec4 color = texture2D(u_video, v_texCoord);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      gray = gray * 1.1 - 0.05;
      gray = clamp(gray, 0.0, 1.0);
      float threshold = atkinsonThreshold(floor(gl_FragCoord.xy / 4.0));
      float dithered = step(threshold, gray);
      gl_FragColor = vec4(mix(dark, light, dithered), 1.0);
    }
  \`;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const texBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);
  const texLoc = gl.getAttribLocation(program, 'a_texCoord');
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.src = 'waves.mp4';
  video.playbackRate = 0.8;

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program, 'u_video'), 0);

  const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  let videoReady = false;

  function setupCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);

    if (video.videoWidth && video.videoHeight) {
      const canvasAspect = canvas.width / canvas.height;
      const videoAspect = video.videoWidth / video.videoHeight;
      let texTop = 1, texBottom = 0, texLeft = 0, texRight = 1;
      if (videoAspect > canvasAspect) {
        const scale = canvasAspect / videoAspect;
        texLeft = (1 - scale) / 2;
        texRight = 1 - texLeft;
      } else {
        const scale = videoAspect / canvasAspect;
        texBottom = (1 - scale) / 2;
        texTop = 1 - texBottom;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        texLeft, texBottom, texRight, texBottom,
        texLeft, texTop, texRight, texTop
      ]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    }
  }

  function render() {
    if (videoReady && !video.paused && !video.ended) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }

  video.addEventListener('loadeddata', function() {
    videoReady = true;
    setupCanvas();
    video.play().catch(function() {});
  });

  document.addEventListener('click', function() {
    if (video.paused) video.play();
  }, { once: true });

  window.addEventListener('resize', setupCanvas);
  setupCanvas();
  render();
})();
</script>
`;

// Inject after <body> tag
html = html.replace(/<body[^>]*>/, '$&' + backdropScript);

// Make slide backgrounds transparent so backdrop shows through
html = html.replace(
  /<\/style>/,
  `
  section {
    background: transparent !important;
  }
  svg.bespoke-marp-slide {
    background: transparent !important;
  }
</style>`
);

fs.writeFileSync(htmlFile, html);
console.log(`Injected backdrop into ${htmlFile}`);
