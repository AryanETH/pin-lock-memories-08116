import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { cities } from "@/lib/cities";

// Load OrbitControls dynamically
const loadOrbitControls = async () => {
  return new Promise<void>((resolve) => {
    if ((THREE as any).OrbitControls) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

interface GlobeProps {
  className?: string;
  onCityChange?: (city: string) => void;
}

// Converts lat/lng to a THREE.Vector3 on a sphere with given radius
function latLngToVector3(lat: number, lng: number, radius: number = 2): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// Create blurry star texture
function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export default function Globe({ className, onCityChange }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<any>(null);
  const currentMarkerRef = useRef<THREE.Mesh | null>(null);
  const cometsRef = useRef<THREE.Mesh[]>([]);
  const starMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const animationRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const init = async () => {
      await loadOrbitControls();
      
      if (!mounted || !containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      // Scene setup with black background
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 12;
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // OrbitControls
      const OrbitControls = (THREE as any).OrbitControls;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controlsRef.current = controls;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
      scene.add(ambientLight);
      const light = new THREE.DirectionalLight(0xffffff, 1.2);
      light.position.set(5, 3, 5).normalize();
      scene.add(light);

      // Earth
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg');
      const earthGeo = new THREE.SphereGeometry(2, 64, 64);
      const earthMat = new THREE.MeshPhongMaterial({ map: earthTexture });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      scene.add(earth);
      earthRef.current = earth;

      // Starfield with proper z-depth distribution
      const starVertices: number[] = [];
      for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(1000);
        const y = THREE.MathUtils.randFloatSpread(1000);
        const z = THREE.MathUtils.randFloatSpread(1000);
        starVertices.push(x, y, z);
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      
      const starMaterial = new THREE.PointsMaterial({
        map: createStarTexture(),
        size: 2.5,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      });
      starMaterialRef.current = starMaterial;
      
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Comet spawning with better visibility
      const spawnComet = () => {
        const cometGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const cometMat = new THREE.MeshBasicMaterial({ 
          color: 0xffffff, 
          transparent: true,
          opacity: 1
        });
        const comet = new THREE.Mesh(cometGeo, cometMat);
        
        // Spawn comets in a sphere around the scene
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        const radius = 40 + Math.random() * 20;
        
        const startX = Math.cos(angle1) * Math.cos(angle2) * radius;
        const startY = Math.sin(angle2) * radius;
        const startZ = Math.sin(angle1) * Math.cos(angle2) * radius;
        
        comet.position.set(startX, startY, startZ);
        
        // Random direction with slight bias towards center
        const targetX = (Math.random() - 0.5) * 10;
        const targetY = (Math.random() - 0.5) * 10;
        const targetZ = (Math.random() - 0.5) * 10;
        
        const direction = new THREE.Vector3(targetX - startX, targetY - startY, targetZ - startZ).normalize();
        (comet as any).userData.velocity = direction.multiplyScalar(0.15);
        (comet as any).userData.startTime = Date.now();

        scene.add(comet);
        cometsRef.current.push(comet);
      };

      const cometLoop = () => {
        if (mounted) {
          spawnComet();
          setTimeout(cometLoop, 2000);
        }
      };
      cometLoop();

      // Auto-rotation management
      const resumeAutoRotation = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = setTimeout(() => { 
          if (controls) controls.autoRotate = true; 
        }, 3000);
      };
      
      const stopAutoRotation = () => {
        if (controls) controls.autoRotate = false;
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      };

      renderer.domElement.addEventListener('mousedown', stopAutoRotation);
      renderer.domElement.addEventListener('mouseup', resumeAutoRotation);
      renderer.domElement.addEventListener('touchstart', stopAutoRotation);
      renderer.domElement.addEventListener('touchend', resumeAutoRotation);

      // Resize handler
      const onResize = () => {
        if (!containerRef.current || !camera || !renderer) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      // Animation loop
      const animate = (time: number) => {
        if (!mounted) return;
        
        TWEEN.update(time);

        // Star blinking
        if (starMaterialRef.current) {
          const blinkTime = Date.now() * 0.0001;
          starMaterialRef.current.opacity = 0.6 + Math.sin(blinkTime) * 0.4;
        }
        
        // Comet animation with fading
        for (let i = cometsRef.current.length - 1; i >= 0; i--) {
          const comet = cometsRef.current[i];
          const userData = (comet as any).userData;
          
          comet.position.add(userData.velocity);
          
          // Calculate life time and fade out
          const lifeTime = (Date.now() - userData.startTime) / 1000;
          const maxLife = 10;
          
          if (lifeTime < maxLife) {
            // Blinking effect
            const opacity = 0.7 + Math.sin(Date.now() * 0.005 + i) * 0.3;
            (comet.material as THREE.MeshBasicMaterial).opacity = opacity * (1 - lifeTime / maxLife);
          } else {
            scene.remove(comet);
            cometsRef.current.splice(i, 1);
          }
        }

        if (controls) controls.update();
        renderer.render(scene, camera);
        animationRef.current = requestAnimationFrame(animate);
      };
      animate(0);

      return () => {
        mounted = false;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('mousedown', stopAutoRotation);
        renderer.domElement.removeEventListener('mouseup', resumeAutoRotation);
        renderer.domElement.removeEventListener('touchstart', stopAutoRotation);
        renderer.domElement.removeEventListener('touchend', resumeAutoRotation);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        controls?.dispose();
        renderer.dispose();
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // City marker and camera rotation
  const showCityMarker = (lat: number, lng: number) => {
    if (!sceneRef.current) return;

    // Hide previous marker
    if (currentMarkerRef.current) {
      new TWEEN.Tween((currentMarkerRef.current.material as THREE.MeshBasicMaterial))
        .to({ opacity: 0 }, 500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onComplete(() => {
          if (currentMarkerRef.current && sceneRef.current) {
            sceneRef.current.remove(currentMarkerRef.current);
          }
        })
        .start();
    }
    
    const markerGeo = new THREE.ConeGeometry(0.05, 0.2, 16);
    markerGeo.translate(0, 0.1, 0);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff4141, transparent: true, opacity: 0 });
    const marker = new THREE.Mesh(markerGeo, markerMat);

    const position = latLngToVector3(lat, lng, 2);
    marker.position.copy(position);
    marker.lookAt(new THREE.Vector3(0, 0, 0));
    marker.rotateX(Math.PI / 2);

    sceneRef.current.add(marker);
    currentMarkerRef.current = marker;

    new TWEEN.Tween(markerMat)
      .to({ opacity: 1 }, 500)
      .easing(TWEEN.Easing.Cubic.In)
      .delay(500)
      .start();
  };

  const pointCameraToCity = (lat: number, lng: number) => {
    if (!cameraRef.current || !controlsRef.current) return;

    if (controlsRef.current) controlsRef.current.autoRotate = false;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    const targetPosition = latLngToVector3(lat, lng, 2);
    const cameraDistance = cameraRef.current.position.length();
    const newCameraPosition = targetPosition.clone().normalize().multiplyScalar(cameraDistance);

    new TWEEN.Tween(cameraRef.current.position)
      .to(newCameraPosition, 1500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        if (cameraRef.current) {
          cameraRef.current.lookAt(0, 0, 0);
        }
      })
      .onComplete(() => {
        if (controlsRef.current) {
          controlsRef.current.update();
          inactivityTimerRef.current = setTimeout(() => {
            if (controlsRef.current) controlsRef.current.autoRotate = true;
          }, 3000);
        }
      })
      .start();
  };

  // Expose method to show city from parent
  useEffect(() => {
    (window as any).showCity = (cityName: string) => {
      const city = cities.find(c => c.name === cityName);
      if (city) {
        setTimeout(() => {
          pointCameraToCity(city.lat, city.lng);
          showCityMarker(city.lat, city.lng);
        }, 200);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ width: '100%', height: '100%', background: '#000000' }}
    />
  );
}
