/* ============================================
   FANTASY THEME — WebGL Hero Particle System
   Ethereal magical dust / embers with mouse wake
   ============================================ */

(function() {
  'use strict';

  const container = document.getElementById('heroCanvasContainer');
  if (!container) return;

  /* Check for mobile / low-power / reduced motion */
  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isMobile || prefersReducedMotion) {
    /* CSS fallback for mobile */
    container.style.background = 'radial-gradient(ellipse at 30% 50%, rgba(201,169,110,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(245,240,232,0.1) 0%, transparent 40%), #1a1512';
    return;
  }

  /* ── Three.js Setup ── */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x1a1512, 1);
  container.appendChild(renderer.domElement);

  /* ── Particle Count ── */
  const PARTICLE_COUNT = 2500;

  /* ── Custom Shader Material ── */
  const vertexShader = `
    attribute float size;
    attribute float phase;
    attribute float speed;
    varying float vAlpha;
    varying float vSize;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uMouseStrength;

    void main() {
      vec3 pos = position;

      /* Gentle floating motion */
      float t = uTime * speed + phase;
      pos.y += sin(t * 0.5) * 0.3;
      pos.x += cos(t * 0.3) * 0.2;
      pos.z += sin(t * 0.7) * 0.15;

      /* Mouse repulsion */
      vec2 screenPos = (projectionMatrix * modelViewMatrix * vec4(pos, 1.0)).xy;
      float dist = distance(screenPos, uMouse);
      float influence = smoothstep(0.5, 0.0, dist) * uMouseStrength;
      vec2 dir = normalize(screenPos - uMouse + 0.001);
      pos.xy += dir * influence * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      vAlpha = 0.3 + 0.7 * sin(t * 0.8 + phase);
      vSize = size;
    }
  `;

  const fragmentShader = `
    varying float vAlpha;
    varying float vSize;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    void main() {
      /* Circular soft particle */
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      /* Soft glow falloff */
      float glow = 1.0 - smoothstep(0.0, 0.5, dist);
      glow = pow(glow, 1.5);

      /* Color mixing based on size */
      vec3 color = mix(uColor1, uColor2, vSize / 8.0);

      gl_FragColor = vec4(color, glow * vAlpha * 0.8);
    }
  `;

  /* ── Colors ── */
  const color1 = new THREE.Color(0xc9a96e); /* Gold */
  const color2 = new THREE.Color(0xf5f0e8); /* Ivory */

  /* ── Geometry & Attributes ── */
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const phases = new Float32Array(PARTICLE_COUNT);
  const speeds = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    /* Distribute particles in a wide disc */
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 6 + 1;
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = (Math.random() - 0.5) * 5;
    positions[i3 + 2] = (Math.random() - 0.5) * 3;

    sizes[i] = 2 + Math.random() * 6;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.3 + Math.random() * 0.7;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

  /* ── Material ── */
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(999, 999) },
      uMouseStrength: { value: 1.0 },
      uColor1: { value: color1 },
      uColor2: { value: color2 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  /* ── Mouse Tracking ── */
  let mouseX = 999, mouseY = 999;
  let targetMouseX = 999, targetMouseY = 999;

  document.addEventListener('mousemove', (e) => {
    /* Convert to NDC */
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  document.addEventListener('mouseleave', () => {
    targetMouseX = 999;
    targetMouseY = 999;
  });

  /* ── Resize Handler ── */
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100);
  });

  /* ── Animation Loop ── */
  const clock = new THREE.Clock();
  let isVisible = true;

  /* Visibility check */
  const heroSection = document.getElementById('heroSection');
  if (heroSection) {
    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0 });
    observer.observe(heroSection);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (!isVisible) return;

    const elapsed = clock.getElapsedTime();

    /* Smooth mouse */
    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    material.uniforms.uTime.value = elapsed;
    material.uniforms.uMouse.value.set(mouseX, mouseY);

    /* Slow rotation of entire system */
    particles.rotation.y = elapsed * 0.02;
    particles.rotation.x = Math.sin(elapsed * 0.1) * 0.05;

    renderer.render(scene, camera);
  }

  animate();

  /* ── Scroll fade for canvas ── */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.to(renderer.domElement, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: heroSection,
        start: '60% top',
        end: 'bottom top',
        scrub: true
      }
    });
  }

})();
