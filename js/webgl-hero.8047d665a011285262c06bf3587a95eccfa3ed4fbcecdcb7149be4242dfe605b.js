/* DIMS — Star Nest / Golden Ether ambient stage */
(function () {
  'use strict';
  const primaryContainer = document.getElementById('heroCanvasContainer');
  const primaryScope = document.getElementById('shaderScope') || document.getElementById('heroSection');

  const requested = new URLSearchParams(location.search).get('shader');
  const storedMode = Number(document.documentElement.dataset.heroShaderMode);
  const mode = requested === '0' || requested === '1' ? Number(requested) : (storedMode === 1 ? 1 : 0);
  const modeName = mode === 0 ? 'star-nest' : 'golden-ether';
  document.documentElement.dataset.heroShaderMode = String(mode);
  if (primaryScope) {
    primaryScope.dataset.shaderMode = String(mode);
    primaryScope.dataset.shaderName = modeName;
  }

  const vertexSource = `#version 300 es
  in vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

  const fragmentSource = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uGrain;
  uniform int uMode;
  uniform int uScene;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0, amplitude = 0.52;
    mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rotation * p * 2.03 + 9.17;
      amplitude *= 0.5;
    }
    return value;
  }

  float ridged(vec2 p) { return 1.0 - abs(fbm(p) * 2.0 - 1.0); }

  vec2 aspectUv(vec2 uv) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / max(uResolution.y, 1.0);
    return p;
  }

  vec3 starNest(vec2 uv, float time) {
    vec3 dir = vec3(uv * 0.8, 1.0);
    float t = time * 0.02 + 0.25;
    float a1 = 0.5 + (uPointer.x - 0.5) * 0.7;
    float a2 = 0.8 + (uPointer.y - 0.5) * 0.55;
    mat2 rot1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
    mat2 rot2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
    dir.xz *= rot1;
    dir.xy *= rot2;
    vec3 from = vec3(1.0, 0.5, 0.5) + vec3(t * 2.0, t, -2.0);
    from.xz *= rot1;
    from.xy *= rot2;
    float hueDrift = 0.5 + 0.5 * sin(time * 0.045);
    vec3 ramp = vec3(mix(1.35, 1.05, hueDrift), mix(0.80, 0.62, hueDrift), mix(0.48, 0.60, hueDrift));
    float s = 0.1, fade = 1.0;
    vec3 v = vec3(0.0);
    for (int r = 0; r < 20; r++) {
      vec3 p = from + s * dir * 0.5;
      p = abs(vec3(0.85) - mod(p, vec3(1.7)));
      float pa = 0.0, a = 0.0;
      for (int i = 0; i < 17; i++) {
        p = abs(p) / max(dot(p, p), 0.0001) - 0.53;
        a += abs(length(p) - pa);
        pa = length(p);
      }
      float dm = max(0.0, 0.3 - a * a * 0.001);
      a *= a * a;
      if (r > 6) fade *= 1.0 - dm;
      v += fade;
      v += vec3(s * ramp.x, s * s * ramp.y, s * s * s * ramp.z) * a * 0.002 * fade;
      fade *= 0.73;
      s += 0.1;
    }
    v = mix(vec3(length(v)), v, 0.92);
    return clamp(v, vec3(0.0), vec3(200.0)) * 0.012;
  }

  vec3 goldenEther(vec2 p, float time) {
    float t = time * 0.05;
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t * 0.7));
    vec2 r = vec2(fbm(p + 2.2 * q + vec2(1.7, 9.2) + t * 0.3),
                  fbm(p + 2.4 * q + vec2(8.3, 2.8) - t * 0.25));
    float f = fbm(p + 2.6 * r);
    float rim = pow(smoothstep(0.55, 0.95, ridged(p * 2.0 + r * 3.0)), 2.0);
    vec3 charcoal = vec3(0.070, 0.058, 0.050);
    vec3 bronze = vec3(0.42, 0.30, 0.16);
    vec3 gold = vec3(0.83, 0.63, 0.31);
    vec3 ivory = vec3(0.96, 0.92, 0.80);
    vec3 color = mix(charcoal, bronze, clamp(f * f * 3.2, 0.0, 1.0));
    color = mix(color, gold, clamp(length(q) * 0.7 - 0.15, 0.0, 1.0) * 0.55);
    color = mix(color, ivory, pow(clamp(r.y, 0.0, 1.0), 3.0) * 0.50);
    color += gold * rim * 0.22;
    color += ivory * pow(rim, 3.0) * 0.18;
    color *= 0.36 + f * 1.45;
    return color;
  }

  vec2 missingCoordinateWarp(vec2 p, float time) {
    float row = floor((p.y + 2.4) * 9.0);
    float rowPhase = hash21(vec2(row, 17.0));
    float rowDrift = 0.5 + 0.5 * sin(time * 0.16 + rowPhase * 6.2831853);
    p.x += (rowPhase - 0.5) * 0.09 * smoothstep(0.86, 0.98, rowDrift);

    float column = floor((p.x + 3.0) * 5.0);
    float columnPhase = hash21(vec2(column, 41.0));
    p.y += (columnPhase - 0.5) * 0.025 * sin(time * 0.08 + columnPhase * 4.0);
    return p;
  }

  vec3 missingCoordinateField(vec3 color, vec2 p, float time) {
    vec2 voidPosition = p - vec2(0.62, -0.02);
    float voidDistance = length(voidPosition / vec2(0.65, 0.50)) - 1.0;
    float voidMask = 1.0 - smoothstep(-0.10, 0.28, voidDistance);
    float voidEdge = 1.0 - smoothstep(0.0, 0.025, abs(voidDistance));

    vec2 cellPosition = (p + vec2(2.8, 2.2)) * vec2(3.5, 6.0);
    vec2 cellId = floor(cellPosition);
    vec2 cellUv = fract(cellPosition) - 0.5;
    float cellInterior = 1.0 - smoothstep(0.38, 0.49, max(abs(cellUv.x), abs(cellUv.y)));
    float missingCell = step(0.92, hash21(cellId + vec2(13.0, 7.0))) * cellInterior * (1.0 - voidMask);

    float scan = pow(0.5 + 0.5 * sin((p.y + time * 0.012) * 115.0), 18.0);
    vec3 voidColor = uMode == 0 ? vec3(0.012, 0.014, 0.022) : vec3(0.80, 0.75, 0.64);
    vec3 coordinateColor = uMode == 0 ? vec3(0.80, 0.68, 0.47) : vec3(0.26, 0.19, 0.12);

    color = mix(color, voidColor, voidMask * 0.72);
    color *= 1.0 - missingCell * 0.24;
    color += coordinateColor * scan * (0.015 + 0.025 * (1.0 - voidMask));
    color = mix(color, coordinateColor, voidEdge * 0.14);
    return color;
  }

  void main() {
    vec2 uv01 = gl_FragCoord.xy / uResolution.xy;
    vec2 p = aspectUv(uv01);
    vec2 samplePoint = uScene == 1 ? missingCoordinateWarp(p, uTime) : p;
    vec3 color = uMode == 0 ? starNest(samplePoint * 0.5, uTime) : goldenEther(samplePoint * 1.1, uTime);
    if (uScene == 1) color = missingCoordinateField(color, p, uTime);
    color = max(color, vec3(0.0));
    float grain = hash21(gl_FragCoord.xy + fract(uTime) * 173.0) - 0.5;
    color += grain * uGrain * 0.05;
    float vignette = smoothstep(1.45, 0.25, length(p * vec2(0.72, 0.92)));
    color *= mix(0.72, 1.05, vignette);
    color = color / (color + vec3(0.55));
    color = pow(color, vec3(0.90));
    fragColor = vec4(color, 1.0);
  }`;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ambientMirrors = [...document.querySelectorAll('.featured-shader-stage.is-ambient-window')].map(container => {
    const canvas = document.createElement('canvas');
    canvas.className = 'featured-shader-canvas ambient-shader-mirror';
    container.appendChild(canvas);
    return { container, canvas, context: canvas.getContext('2d', { alpha: false }) };
  }).filter(mirror => mirror.context);
  let lastAmbientFrame = 0;

  function paintAmbientMirrors(source, now) {
    if (!ambientMirrors.length) return;
    if (!reducedMotion.matches && now - lastAmbientFrame < 42) return;
    lastAmbientFrame = now;
    ambientMirrors.forEach(({ container, canvas, context }) => {
      const bounds = container.getBoundingClientRect();
      if (bounds.bottom < -200 || bounds.top > window.innerHeight + 200) return;
      const quality = Math.min(window.devicePixelRatio || 1, 1);
      const width = Math.max(1, Math.floor(container.clientWidth * quality));
      const height = Math.max(1, Math.floor(container.clientHeight * quality));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const sourceRatio = source.width / source.height;
      const targetRatio = width / height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = source.width;
      let sourceHeight = source.height;
      if (sourceRatio > targetRatio) {
        sourceWidth = source.height * targetRatio;
        sourceX = (source.width - sourceWidth) * 0.5;
      } else {
        sourceHeight = source.width / targetRatio;
        sourceY = (source.height - sourceHeight) * 0.5;
      }
      context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    });
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function mountStage(container, visibilityTarget, canvasClass, failureTarget, mirrorSource) {
    const canvas = document.createElement('canvas');
    canvas.className = canvasClass;
    container.appendChild(canvas);
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    if (!gl) {
      failureTarget.classList.add('shader-unavailable');
      canvas.remove();
      return null;
    }

    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (_) {
      canvas.remove();
      failureTarget.classList.add('shader-unavailable');
      return null;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'uResolution');
    const timeUniform = gl.getUniformLocation(program, 'uTime');
    const modeUniform = gl.getUniformLocation(program, 'uMode');
    const sceneUniform = gl.getUniformLocation(program, 'uScene');
    const pointerUniform = gl.getUniformLocation(program, 'uPointer');
    const grainUniform = gl.getUniformLocation(program, 'uGrain');
    gl.uniform1i(modeUniform, mode);
    gl.uniform1i(sceneUniform, visibilityTarget.dataset.shaderScene === 'missing-coordinates' ? 1 : 0);
    gl.uniform2f(pointerUniform, 0.5, 0.5);
    gl.uniform1f(grainUniform, mode === 0 ? 0.18 : 0.12);

    let visible = true;
    let frame = 0;
    const startedAt = performance.now();

    function resize() {
      const qualityCap = canvasClass === 'hero-shader-canvas' ? (mode === 0 ? 1.12 : 1.3) : 1;
      const quality = Math.min(window.devicePixelRatio || 1, qualityCap);
      const width = Math.max(1, Math.floor(container.clientWidth * quality));
      const height = Math.max(1, Math.floor(container.clientHeight * quality));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    function draw(now) {
      resize();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, reducedMotion.matches ? 0 : (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (mirrorSource) paintAmbientMirrors(canvas, now);
    }

    function loop(now) {
      frame = 0;
      draw(now);
      if (visible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(loop);
    }

    function updatePlayback() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(loop);
      else draw(performance.now());
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        updatePlayback();
      }, { threshold: 0.01 }).observe(visibilityTarget);
    }
    document.addEventListener('visibilitychange', updatePlayback);
    window.addEventListener('resize', () => draw(performance.now()), { passive: true });
    reducedMotion.addEventListener?.('change', updatePlayback);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      failureTarget.classList.add('shader-unavailable');
    });
    draw(startedAt);
    updatePlayback();
    return { updatePlayback };
  }

  if (primaryContainer && primaryScope) {
    mountStage(primaryContainer, primaryScope, 'hero-shader-canvas', primaryScope, true);
  }

  const previews = [...document.querySelectorAll('[data-featured-shader="local"]')];
  const mountPreview = container => {
    if (container.dataset.shaderMounted === 'true') return;
    container.dataset.shaderMounted = 'true';
    mountStage(container, container.closest('.featured-media') || container, 'featured-shader-canvas', container, false);
  };
  if ('IntersectionObserver' in window) {
    const previewObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        mountPreview(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '240px 0px', threshold: 0.01 });
    previews.forEach(preview => previewObserver.observe(preview));
  } else {
    previews.forEach(mountPreview);
  }
})();
