(function () {
  'use strict';

  const canvas = document.getElementById('shaderCanvas');
  const errorPanel = document.getElementById('errorPanel');
  const errorMessage = document.getElementById('errorMessage');
  const fpsNode = document.getElementById('fps');
  const eyebrow = document.getElementById('eyebrow');
  const description = document.getElementById('description');
  const pauseButton = document.getElementById('pause');
  const speedInput = document.getElementById('speed');
  const intensityInput = document.getElementById('intensity');
  const grainInput = document.getElementById('grain');
  const presetButtons = Array.from(document.querySelectorAll('.preset'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const presets = [
    {
      eyebrow: 'I · LUMEN VELLUM',
      description: '流动的羊皮纸光泽与细金纹，适合作为当前首页的默认方向。',
      speed: 0.72,
      intensity: 1,
      grain: 0.22
    },
    {
      eyebrow: 'II · GILDED VEIL',
      description: '更强的丝绸折射与金箔高光，适合项目页或重点内容的首屏。',
      speed: 0.58,
      intensity: 1.18,
      grain: 0.12
    },
    {
      eyebrow: 'III · VERDANT MIST',
      description: '森林绿、象牙白与金色雾气叠加，氛围更神秘但仍保持文字可读。',
      speed: 0.44,
      intensity: 0.92,
      grain: 0.28
    },
    {
      eyebrow: 'IV · ARCANE ECLIPSE',
      description: '暗色星环与炼金光晕，适合作为文章页封面或夜间视觉变体。',
      speed: 0.5,
      intensity: 1.08,
      grain: 0.16
    }
  ];

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });

  if (!gl) {
    showError('当前浏览器不支持 WebGL2。');
    canvas.style.background = 'radial-gradient(circle at 50% 45%, #d8c4a0, #635747 45%, #17120f 100%)';
    return;
  }

  const vertexSource = `#version 300 es
    precision highp float;
    in vec2 aPosition;

    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentSource = `#version 300 es
    precision highp float;

    out vec4 fragColor;

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uGrain;
    uniform int uMode;

    #define PI 3.14159265359

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.52;
      mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = rotation * p * 2.03 + 9.17;
        amplitude *= 0.5;
      }

      return value;
    }

    float ridged(vec2 p) {
      float n = fbm(p);
      return 1.0 - abs(n * 2.0 - 1.0);
    }

    vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
      return a + b * cos(6.28318 * (c * t + d));
    }

    vec2 aspectUv(vec2 uv) {
      vec2 p = uv * 2.0 - 1.0;
      p.x *= uResolution.x / max(uResolution.y, 1.0);
      return p;
    }

    vec3 lumenVellum(vec2 uv, vec2 p, float time) {
      vec2 pointer = aspectUv(uPointer);
      float pointerDist = length(p - pointer);
      float pointerWake = exp(-pointerDist * 3.4);

      vec2 q = vec2(
        fbm(p * 1.15 + vec2(time * 0.055, -time * 0.025)),
        fbm(p * 1.15 + vec2(5.2, -3.7) - time * 0.03)
      );
      vec2 r = vec2(
        fbm(p * 2.0 + 3.2 * q + vec2(time * 0.05, 1.7)),
        fbm(p * 1.8 + 2.8 * q + vec2(-2.8, time * 0.04))
      );

      float flow = fbm(p * 1.2 + 2.2 * r);
      float veins = pow(smoothstep(0.62, 0.92, ridged(p * 3.4 + r * 3.0)), 2.0);
      float halo = exp(-length(p - vec2(-0.15, 0.08)) * 0.78);
      float wake = pointerWake * (0.5 + 0.5 * sin(8.0 * pointerDist - time * 1.8));

      vec3 ivory = vec3(0.945, 0.917, 0.865);
      vec3 parchment = vec3(0.73, 0.65, 0.52);
      vec3 gold = vec3(0.80, 0.62, 0.31);
      vec3 ink = vec3(0.18, 0.15, 0.12);

      vec3 color = mix(ivory, parchment, smoothstep(0.22, 0.88, flow) * 0.42);
      color = mix(color, gold, veins * 0.32 * uIntensity);
      color += gold * halo * 0.17 * uIntensity;
      color += vec3(0.12, 0.09, 0.04) * wake * uIntensity;
      color = mix(color, ink, smoothstep(0.82, 1.15, length(p)) * 0.12);
      return color;
    }

    vec3 gildedVeil(vec2 uv, vec2 p, float time) {
      vec2 warped = p;
      warped.x += sin(p.y * 2.0 + time * 0.16) * 0.15;
      warped.y += sin(p.x * 1.3 - time * 0.12) * 0.08;

      float folds = sin(warped.x * 3.0 + fbm(warped * 1.5 + time * 0.035) * 5.0);
      folds += sin(warped.x * 6.3 - warped.y * 1.8 + time * 0.11) * 0.32;
      folds = folds * 0.5 + 0.5;
      folds = pow(clamp(folds, 0.0, 1.0), 2.2);

      float secondary = fbm(warped * 2.6 + vec2(time * 0.02, -time * 0.045));
      float specular = pow(smoothstep(0.56, 0.98, folds), 3.0);
      float center = exp(-dot(p * vec2(0.72, 1.2), p * vec2(0.72, 1.2)) * 0.42);

      vec3 umber = vec3(0.10, 0.078, 0.062);
      vec3 bronze = vec3(0.38, 0.27, 0.15);
      vec3 gold = vec3(0.86, 0.67, 0.36);
      vec3 pearl = vec3(0.95, 0.91, 0.82);

      vec3 color = mix(umber, bronze, folds * 0.82);
      color = mix(color, gold, specular * 0.86 * uIntensity);
      color = mix(color, pearl, pow(specular, 3.0) * 0.38 * uIntensity);
      color += gold * secondary * center * 0.18;
      return color;
    }

    vec3 verdantMist(vec2 uv, vec2 p, float time) {
      vec2 drift = vec2(time * 0.035, -time * 0.018);
      float mistA = fbm(p * 1.1 + drift);
      float mistB = fbm(p * 2.15 - drift * 1.7 + vec2(4.2, -1.8));
      float tendrils = ridged(p * 2.5 + vec2(mistA, mistB) * 2.6);
      float light = exp(-length(p - vec2(0.48, 0.12)) * 1.15);
      float shadow = smoothstep(0.45, 0.9, mistB);

      vec3 charcoal = vec3(0.075, 0.09, 0.075);
      vec3 forest = vec3(0.12, 0.25, 0.19);
      vec3 sage = vec3(0.42, 0.52, 0.39);
      vec3 gold = vec3(0.76, 0.60, 0.34);
      vec3 ivory = vec3(0.91, 0.88, 0.78);

      vec3 color = mix(charcoal, forest, mistA);
      color = mix(color, sage, mistB * 0.48);
      color += ivory * light * 0.34 * uIntensity;
      color += gold * pow(tendrils, 4.0) * 0.22 * uIntensity;
      color *= 1.0 - shadow * 0.18;
      return color;
    }

    float starLayer(vec2 p, float scale, float density, float seed, float time) {
      vec2 grid = p * scale;
      vec2 cell = floor(grid);
      vec2 local = fract(grid) - 0.5;
      float randomValue = hash21(cell + seed);
      float exists = step(1.0 - density, randomValue);

      vec2 offset = vec2(
        hash21(cell + seed + 17.31),
        hash21(cell + seed + 41.73)
      ) - 0.5;
      local -= offset * 0.58;

      float sizeRandom = hash21(cell + seed + 8.17);
      float radius = mix(0.035, 0.075, sizeRandom);
      float distanceToStar = length(local);
      float antialias = max(fwidth(distanceToStar) * 1.5, 0.003);
      float core = 1.0 - smoothstep(radius - antialias, radius + antialias, distanceToStar);
      float glow = exp(-distanceToStar * 28.0) * 0.16;
      float twinkle = 0.72 + 0.28 * sin(time * mix(0.35, 0.7, sizeRandom) + randomValue * 18.0);

      return exists * (core + glow) * twinkle;
    }

    vec3 arcaneEclipse(vec2 uv, vec2 p, float time) {
      /* Keep the eclipse composition anchored. Pointer-following made the
         celestial body feel like a UI cursor effect instead of a backdrop. */
      /* Share the exact geometric center with the HTML hero copy. */
      vec2 center = vec2(0.0);
      vec2 q = p - center;
      float radius = length(q);
      float angle = atan(q.y, q.x);

      /* Sample angular noise through sine/cosine coordinates. Unlike feeding
         atan() directly into noise, this is continuous across -PI / PI. */
      vec2 circular = vec2(cos(angle), sin(angle));
      float turbulence = fbm(
        circular * 2.1 +
        vec2(radius * 3.4 - time * 0.055, radius * 1.7 + time * 0.025)
      );
      float ringRadius = 0.48 + (turbulence - 0.5) * 0.10;
      float ring = exp(-abs(radius - ringRadius) * 28.0);
      float outerGlow = exp(-abs(radius - ringRadius) * 7.0);
      float rays = pow(max(0.0, sin(angle * 7.0 + turbulence * 4.0 + time * 0.18)), 7.0);
      rays *= smoothstep(0.32, 0.7, radius) * (1.0 - smoothstep(0.85, 1.5, radius));
      float nearStars = starLayer(p, 38.0, 0.032, 13.7, time);
      float farStars = starLayer(p + vec2(2.3, -1.7), 67.0, 0.014, 47.2, time * 0.7);
      float starMask = mix(0.16, 1.0, smoothstep(0.30, 0.82, radius));
      float stars = (nearStars + farStars * 0.52) * starMask;

      vec3 voidColor = vec3(0.035, 0.027, 0.026);
      vec3 burgundy = vec3(0.30, 0.075, 0.10);
      vec3 gold = vec3(0.90, 0.67, 0.29);
      vec3 ivory = vec3(0.98, 0.91, 0.76);

      vec3 color = voidColor;
      color += burgundy * fbm(p * 1.6 + time * 0.018) * 0.46;
      color += gold * outerGlow * 0.34 * uIntensity;
      color += gold * ring * 0.85 * uIntensity;
      color += ivory * pow(ring, 5.0) * 0.72;
      color += gold * rays * 0.14;
      color += ivory * stars * 0.42;
      color *= 1.0 - exp(-radius * 8.0) * 0.88;
      return color;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = aspectUv(uv);
      float time = uTime;
      vec3 color;

      if (uMode == 0) {
        color = lumenVellum(uv, p, time);
      } else if (uMode == 1) {
        color = gildedVeil(uv, p, time);
      } else if (uMode == 2) {
        color = verdantMist(uv, p, time);
      } else {
        color = arcaneEclipse(uv, p, time);
      }

      float grain = hash21(gl_FragCoord.xy + fract(time) * 173.0) - 0.5;
      color += grain * uGrain * 0.065;

      float vignette = smoothstep(1.42, 0.2, length(p * vec2(0.72, 0.92)));
      float edgeExposure = uMode == 0 ? 0.88 : 0.72;
      color *= mix(edgeExposure, 1.04, vignette);

      color = color / (color + vec3(0.72));
      if (uMode == 0) {
        color = mix(color, vec3(0.94, 0.91, 0.85), 0.18);
        color *= 1.08;
      }
      color = pow(color, vec3(0.92));
      fragColor = vec4(color, 1.0);
    }
  `;

  let program;

  try {
    program = createProgram(vertexSource, fragmentSource);
  } catch (error) {
    showError(error.message);
    return;
  }

  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const uniforms = {
    resolution: gl.getUniformLocation(program, 'uResolution'),
    pointer: gl.getUniformLocation(program, 'uPointer'),
    time: gl.getUniformLocation(program, 'uTime'),
    intensity: gl.getUniformLocation(program, 'uIntensity'),
    grain: gl.getUniformLocation(program, 'uGrain'),
    mode: gl.getUniformLocation(program, 'uMode')
  };

  const vertexArray = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();

  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  let currentMode = 0;
  let paused = reducedMotion;
  let elapsed = 0;
  let lastFrame = performance.now();
  let pointerX = 0.5;
  let pointerY = 0.5;
  let targetPointerX = 0.5;
  let targetPointerY = 0.5;
  let fpsFrames = 0;
  let fpsStartedAt = performance.now();
  let dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 1.6);

  if (paused) {
    pauseButton.textContent = '继续';
    pauseButton.setAttribute('aria-pressed', 'true');
  }

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log || 'Unknown shader compile error');
    }

    return shader;
  }

  function createProgram(vertex, fragment) {
    const vertexShader = createShader(gl.VERTEX_SHADER, vertex);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragment);
    const shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(shaderProgram);
      gl.deleteProgram(shaderProgram);
      throw new Error(log || 'Unknown shader link error');
    }

    return shaderProgram;
  }

  function showError(message) {
    errorPanel.hidden = false;
    errorMessage.textContent = message;
  }

  function resize() {
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function updateOutput(input) {
    const output = input.parentElement.querySelector('output');
    output.value = Number(input.value).toFixed(2);
  }

  function selectPreset(mode, applyValues) {
    currentMode = mode;
    const preset = presets[mode];
    document.body.dataset.mode = String(mode);

    presetButtons.forEach((button, index) => {
      const active = index === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });

    eyebrow.textContent = preset.eyebrow;
    description.textContent = preset.description;

    if (applyValues) {
      speedInput.value = preset.speed;
      intensityInput.value = preset.intensity;
      grainInput.value = preset.grain;
      [speedInput, intensityInput, grainInput].forEach(updateOutput);
    }
  }

  function togglePause() {
    paused = !paused;
    pauseButton.textContent = paused ? '继续' : '暂停';
    pauseButton.setAttribute('aria-pressed', String(paused));
    lastFrame = performance.now();
  }

  function render(now) {
    resize();

    const delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    if (!paused) {
      elapsed += delta * Number(speedInput.value);
    }

    pointerX += (targetPointerX - pointerX) * 0.06;
    pointerY += (targetPointerY - pointerY) * 0.06;

    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, pointerX, pointerY);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.intensity, Number(intensityInput.value));
    gl.uniform1f(uniforms.grain, Number(grainInput.value));
    gl.uniform1i(uniforms.mode, currentMode);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    fpsFrames += 1;
    if (now - fpsStartedAt >= 1000) {
      const fps = Math.round((fpsFrames * 1000) / (now - fpsStartedAt));
      fpsNode.textContent = fps + ' FPS';

      if (fps < 40 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.15);
      }

      fpsFrames = 0;
      fpsStartedAt = now;
    }

    requestAnimationFrame(render);
  }

  presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectPreset(Number(button.dataset.mode), true);
    });
  });

  [speedInput, intensityInput, grainInput].forEach((input) => {
    input.addEventListener('input', () => updateOutput(input));
  });

  window.addEventListener('pointermove', (event) => {
    targetPointerX = event.clientX / window.innerWidth;
    targetPointerY = 1 - event.clientY / window.innerHeight;
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    targetPointerX = 0.5;
    targetPointerY = 0.5;
  });

  window.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '4') {
      selectPreset(Number(event.key) - 1, true);
    } else if (event.code === 'Space' && event.target.tagName !== 'INPUT') {
      event.preventDefault();
      togglePause();
    }
  });

  window.addEventListener('resize', resize, { passive: true });
  pauseButton.addEventListener('click', togglePause);

  selectPreset(0, true);
  resize();
  requestAnimationFrame(render);
})();
