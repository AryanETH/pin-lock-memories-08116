import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cities } from '@/lib/cities';

interface GlobeProps {
  className?: string;
}

// Utility to convert lat/lng to 3D unit sphere vector
function latLngToVector3(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -Math.sin(phi) * Math.cos(theta);
  const z = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function Globe({ className }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const dayMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const velocityRef = useRef(0); // radians per second around Y
  const lastTimeRef = useRef<number>(0);
  const [labelQueue, setLabelQueue] = useState<string[]>([]);
  const [typedText, setTypedText] = useState('');
  const [fading, setFading] = useState(false);
  const labelIndexRef = useRef(0);
  const typingTimerRef = useRef<number | null>(null);
  const lastRandomIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B0F18');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights: subtle ambient and a directional sun light
    const ambient = new THREE.AmbientLight(0x202030, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.25);
    sun.position.set(5, 2, 2);
    scene.add(sun);

    // Atmosphere glow: larger sphere with additive blending
    const atmosphereGeom = new THREE.SphereGeometry(1.035, 64, 64);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#82CAFF'),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeom, atmosphereMat);
    scene.add(atmosphere);

    // Earth with day/night blending + clouds
    const loader = new THREE.TextureLoader();
    const urls = {
      day: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
      normal: 'https://unpkg.com/three-globe/example/img/earth-normal.jpg',
      specular: 'https://unpkg.com/three-globe/example/img/earth-specular.gif',
      clouds: 'https://unpkg.com/three-globe/example/img/earth-clouds.png',
    } as const;
    const tex = Object.fromEntries(
      (Object.entries(urls) as [keyof typeof urls, string][]).map(([k, u]) => {
        const t = loader.load(u);
        t.colorSpace = THREE.SRGBColorSpace as any;
        t.anisotropy = 8;
        t.generateMipmaps = true;
        return [k, t];
      })
    ) as Record<keyof typeof urls, THREE.Texture>;

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Daylit earth using PBR-ish material
    const globeGeom = new THREE.SphereGeometry(1, 256, 256);
    const dayMat = new THREE.MeshStandardMaterial({
      map: tex.day,
      normalMap: tex.normal,
      metalness: 0.02,
      roughness: 0.9,
      roughnessMap: undefined,
      envMapIntensity: 0.15,
    });
    const dayMesh = new THREE.Mesh(globeGeom, dayMat);
    dayMesh.rotation.y = Math.PI;
    globeGroup.add(dayMesh);
    dayMeshRef.current = dayMesh;

    // Night lights overlay only on the dark side, via shader mask
    const nightMat = new THREE.ShaderMaterial({
      uniforms: {
        uNight: { value: tex.night },
        uSunDir: { value: new THREE.Vector3().copy(sun.position).normalize() },
        uIntensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vUv = uv;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uNight;
        uniform vec3 uSunDir;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          // Negative dot means night side
          float ndl = dot(normalize(vNormalW), normalize(uSunDir));
          float nightMask = smoothstep(0.1, -0.2, ndl); // soft terminator
          vec3 nightCol = texture2D(uNight, vUv).rgb * 1.2;
          gl_FragColor = vec4(nightCol * nightMask * uIntensity, nightMask * 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nightMesh = new THREE.Mesh(globeGeom, nightMat);
    nightMesh.rotation.y = Math.PI;
    globeGroup.add(nightMesh);

    // Subtle specular glint for oceans using another overlay material
    // Keep it very faint for realism
    const specularMat = new THREE.MeshPhongMaterial({
      specularMap: tex.specular as any,
      shininess: 12,
      transparent: true,
      opacity: 0.05,
    });
    const specMesh = new THREE.Mesh(globeGeom, specularMat);
    specMesh.rotation.y = Math.PI;
    globeGroup.add(specMesh);

    // Cloud layer
    const cloudsGeom = new THREE.SphereGeometry(1.01, 256, 256);
    const cloudsMat = new THREE.MeshLambertMaterial({
      map: tex.clouds,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudsGeom, cloudsMat);
    clouds.rotation.y = Math.PI;
    globeGroup.add(clouds);
    cloudsMeshRef.current = clouds;

    // Drag/swipe controls
    let pointerDown = false;
    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true;
      isDraggingRef.current = true;
      lastXRef.current = e.clientX;
      velocityRef.current = 0;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown || !globeGroupRef.current) return;
      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      const deltaRad = (dx / width) * Math.PI; // full width -> 180°
      globeGroupRef.current.rotation.y += deltaRad;
      velocityRef.current = deltaRad / (1 / 60); // approx instantaneous velocity
    };
    const onPointerUp = () => {
      pointerDown = false;
      // let inertia fade and resume autorotation
      isDraggingRef.current = false;
    };
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Handle resize
    const onResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(containerRef.current);

    // Animation loop with auto rotation and label updates
    const animate = (t: number) => {
      const timeSec = t / 1000;
      const dt = lastTimeRef.current ? timeSec - lastTimeRef.current : 0;
      lastTimeRef.current = timeSec;

      if (globeGroupRef.current) {
        // Auto-rotation (resume when not dragging)
        const autoSpeed = 0.12; // rad/s
        const damping = 0.95;
        if (!isDraggingRef.current) {
          // decay user imparted velocity to zero
          velocityRef.current *= damping;
          globeGroupRef.current.rotation.y += (autoSpeed + velocityRef.current) * dt;
        } else {
          // while dragging, let rotation be handled by pointer move
        }
      }

      // Drift clouds slowly opposite for parallax
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y -= dt * 0.02;
      }

      // Update labels approximately every 250ms
      if (timeSec % 0.25 < dt && globeGroupRef.current && cameraRef.current) {
        const forward = new THREE.Vector3();
        cameraRef.current.getWorldDirection(forward).normalize();
        // Transform each city vector by globe rotation
        const rotY = new THREE.Matrix4().makeRotationY(globeGroupRef.current.rotation.y);
        const visible = cities
          .map((c) => {
            const v = latLngToVector3(c.lat, c.lng).applyMatrix4(rotY);
            const score = v.dot(forward.negate()); // front-facing hemisphere
            return { name: c.name, score };
          })
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((c) => c.name);
        setLabelQueue((prev) => {
          // Update only if changed to avoid resetting typing unnecessarily
          const same = prev.length === visible.length && prev.every((v, i) => v === visible[i]);
          return same ? prev : visible;
        });
      }

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      containerRef.current?.removeChild(dom);
    };
  }, []);

  // Typing effect with 1s random city cycle and soft fade-out
  useEffect(() => {
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (labelQueue.length === 0) {
      setTypedText('');
      return;
    }
    // Choose a random label from current visible list, avoid immediate repeat
    const pickRandom = () => {
      if (labelQueue.length === 0) return '';
      let idx = Math.floor(Math.random() * labelQueue.length);
      if (labelQueue.length > 1 && idx === lastRandomIndexRef.current) {
        idx = (idx + 1) % labelQueue.length;
      }
      lastRandomIndexRef.current = idx;
      return labelQueue[idx];
    };

    const runCycle = () => {
      const next = pickRandom();
      if (!next) return;
      setFading(false);
      setTypedText('');
      let i = 0;
      const totalMs = 1000;
      const letterDelay = Math.max(18, Math.floor(650 / next.length));
      const typeLetters = () => {
        setTypedText(next.slice(0, i + 1));
        i += 1;
        if (i < next.length) {
          typingTimerRef.current = window.setTimeout(typeLetters, letterDelay);
        } else {
          const typedDuration = i * letterDelay;
          const remaining = Math.max(220, totalMs - typedDuration);
          typingTimerRef.current = window.setTimeout(() => {
            setFading(true);
            typingTimerRef.current = window.setTimeout(() => {
              setTypedText('');
              runCycle();
            }, 220);
          }, remaining - 220);
        }
      };
      typingTimerRef.current = window.setTimeout(typeLetters, 60);
    };

    runCycle();
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [labelQueue]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        className="relative w-full h-full rounded-[24px] overflow-hidden shadow-elevated"
        style={{ background: 'linear-gradient(180deg, #0B0F18 0%, #1A2235 100%)' }}
      />
      {/* Dynamic labels area */}
      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-center text-[15px] sm:text-lg font-medium tracking-wide">
        <span
          className={
            `px-3 py-1 rounded-full bg-white/10 text-[#8ad3ff] shadow-[0_0_24px_rgba(130,202,255,0.35)] transition-opacity duration-200 uppercase font-mono tracking-[0.35em] ` +
            (fading ? 'opacity-0' : 'opacity-100')
          }
        >
          {typedText || ' '}<span className="opacity-70">▌</span>
        </span>
      </div>
    </div>
  );
}
