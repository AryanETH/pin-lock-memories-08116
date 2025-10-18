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
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const velocityRef = useRef(0); // radians per second around Y
  const lastTimeRef = useRef<number>(0);
  const [labelQueue, setLabelQueue] = useState<string[]>([]);
  const [typedText, setTypedText] = useState('');
  const labelIndexRef = useRef(0);
  const typingTimerRef = useRef<number | null>(null);

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
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
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

    // Earth sphere with realistic textures
    const loader = new THREE.TextureLoader();
    const [albedo, normal] = [
      // Higher-saturation blue/green earth textures
      'https://unpkg.com/three-globe/example/img/earth-night.jpg',
      'https://unpkg.com/three-globe/example/img/earth-normal.jpg',
    ].map((url) => loader.load(url));

    const globeGeom = new THREE.SphereGeometry(1, 128, 128);
    const globeMat = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      metalness: 0.0,
      roughness: 0.95,
      emissive: new THREE.Color('#0A3D62'),
      emissiveIntensity: 0.08,
    });
    const globe = new THREE.Mesh(globeGeom, globeMat);
    globe.rotation.y = Math.PI; // orient texture
    scene.add(globe);
    globeMeshRef.current = globe;

    // Drag/swipe controls
    let pointerDown = false;
    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true;
      isDraggingRef.current = true;
      lastXRef.current = e.clientX;
      velocityRef.current = 0;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown || !globeMeshRef.current) return;
      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      const deltaRad = (dx / width) * Math.PI; // full width -> 180°
      globeMeshRef.current.rotation.y += deltaRad;
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

      if (globeMeshRef.current) {
        // Auto-rotation (resume when not dragging)
        const autoSpeed = 0.12; // rad/s
        const damping = 0.95;
        if (!isDraggingRef.current) {
          // decay user imparted velocity to zero
          velocityRef.current *= damping;
          globeMeshRef.current.rotation.y += (autoSpeed + velocityRef.current) * dt;
        } else {
          // while dragging, let rotation be handled by pointer move
        }
      }

      // Update labels approximately every 250ms
      if (timeSec % 0.25 < dt && globeMeshRef.current && cameraRef.current) {
        const forward = new THREE.Vector3();
        cameraRef.current.getWorldDirection(forward).normalize();
        // Transform each city vector by globe rotation
        const rotY = new THREE.Matrix4().makeRotationY(globeMeshRef.current.rotation.y);
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

  // Typing effect cycling through labelQueue
  useEffect(() => {
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (labelQueue.length === 0) {
      setTypedText('');
      return;
    }
    const nextLabel = labelQueue[labelIndexRef.current % labelQueue.length];
    let i = 0;
    const type = () => {
      setTypedText(nextLabel.slice(0, i + 1));
      i += 1;
      if (i < nextLabel.length) {
        typingTimerRef.current = window.setTimeout(type, 40);
      } else {
        // hold so total per-city ~2s
        const totalHoldMs = 2000; // requested 2s interval per city
        const typedDuration = i * 40; // approximate typing ms
        const remainingHold = Math.max(300, totalHoldMs - typedDuration);
        typingTimerRef.current = window.setTimeout(() => {
          labelIndexRef.current += 1;
          // trigger next cycle by updating state
          setTypedText('');
        }, remainingHold);
      }
    };
    typingTimerRef.current = window.setTimeout(type, 200);
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
        <span className="px-3 py-1 rounded-full bg-white/10 text-[#8ad3ff] shadow-[0_0_24px_rgba(130,202,255,0.35)]">
          {typedText || ' '}<span className="opacity-70">▌</span>
        </span>
      </div>
    </div>
  );
}
