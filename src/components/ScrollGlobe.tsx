import { useEffect, useRef, useState } from "react";

interface ScrollGlobeProps {
  scrollProgress: number;
  isScrolling: boolean;
}

export default function ScrollGlobe({ scrollProgress, isScrolling }: ScrollGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<any>(null);
  const earthRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cometsRef = useRef<any[]>([]);
  const starsRef = useRef<any>(null); // Reference to stars for rotation
  const [hasInitialAnimationPlayed, setHasInitialAnimationPlayed] = useState(false);
  const naturalRotationRef = useRef(0);
  const lastScrollProgressRef = useRef(0);

  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        // Check if script already exists or is loading
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          // If script is already loaded, resolve immediately
          if ((existing as HTMLScriptElement).dataset.loaded === 'true') {
            resolve();
            return;
          }
          // If script is loading, wait for it
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject());
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
          script.dataset.loaded = 'true';
          resolve();
        };
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    async function init() {
      try {
        // Check if Three.js is already available
        const THREE = (window as any).THREE;
        if (!THREE) {
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
          await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");
        }

        const ThreeJS = (window as any).THREE;
        const container = containerRef.current;
        if (!container || !ThreeJS) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        
        const camera = new THREE.PerspectiveCamera(
          45, 
          window.innerWidth / window.innerHeight, 
          0.1, 
          1000
        );
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance" // Better mobile performance
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        renderer.setClearColor(0x000000, 1);
        rendererRef.current = renderer;
        container.appendChild(renderer.domElement);

        // Lighting - improved for better visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        const light = new THREE.DirectionalLight(0xffffff, 1.0);
        light.position.set(5, 3, 5);
        scene.add(light);

        // Earth
        const textureLoader = new THREE.TextureLoader();
        const earthTexture = textureLoader.load(
          "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg"
        );
        const earthGeo = new THREE.SphereGeometry(4, 64, 64);
        const earthMat = new THREE.MeshPhongMaterial({ map: earthTexture });
        const earth = new THREE.Mesh(earthGeo, earthMat);
        earth.rotation.y = 0; // Start at 0
        earthRef.current = earth;
        scene.add(earth);

        // Stars - reduced count for mobile performance
        const starCount = window.innerWidth < 768 ? 8000 : 15000;
        const starVertices: number[] = [];
        for (let i = 0; i < starCount; i++) {
          const x = THREE.MathUtils.randFloatSpread(2000);
          const y = THREE.MathUtils.randFloatSpread(2000);
          const z = THREE.MathUtils.randFloatSpread(2000);
          starVertices.push(x, y, z);
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
        const starMaterial = new THREE.PointsMaterial({ 
          color: 0xffffff, 
          size: window.innerWidth < 768 ? 1.2 : 1.5,
          transparent: true, 
          opacity: 0.8 
        });
        const stars = new THREE.Points(starGeometry, starMaterial);
        starsRef.current = stars; // Store reference for rotation
        scene.add(stars);

        // Create comets
        const createComet = () => {
          const cometGeometry = new THREE.SphereGeometry(0.1, 8, 8);
          const cometMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xaaccff,
            transparent: true,
            opacity: 0.9
          });
          const comet = new THREE.Mesh(cometGeometry, cometMaterial);
          
          // Random starting position far from camera
          const angle = Math.random() * Math.PI * 2;
          const distance = 100 + Math.random() * 50;
          comet.position.set(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 100,
            Math.sin(angle) * distance
          );
          
          // Random velocity
          const speed = 0.5 + Math.random() * 1;
          const targetAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
          comet.userData.velocity = new THREE.Vector3(
            Math.cos(targetAngle) * speed,
            (Math.random() - 0.5) * speed * 0.3,
            Math.sin(targetAngle) * speed
          );
          
          // Trail
          const trailGeometry = new THREE.BufferGeometry();
          const trailPositions = [];
          for (let i = 0; i < 20; i++) {
            trailPositions.push(comet.position.x, comet.position.y, comet.position.z);
          }
          trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
          const trailMaterial = new THREE.LineBasicMaterial({ 
            color: 0xaaccff,
            transparent: true,
            opacity: 0.3
          });
          const trail = new THREE.Line(trailGeometry, trailMaterial);
          comet.userData.trail = trail;
          scene.add(trail);
          
          scene.add(comet);
          return comet;
        };

        // Create initial comets
        for (let i = 0; i < 3; i++) {
          cometsRef.current.push(createComet());
        }

        // Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = false; // Disable manual rotation
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // Initial camera position
        camera.position.set(0, 0, 20);
        camera.lookAt(0, 0, 0);

        // Animation loop
        function animate() {
          animationFrameRef.current = requestAnimationFrame(animate);
          
          // Rotate earth naturally during initial animation (before user scrolls)
          if (earthRef.current && !hasInitialAnimationPlayed) {
            earthRef.current.rotation.y += 0.003;
            // Rotate stars with earth during initial animation
            if (starsRef.current) {
              starsRef.current.rotation.y += 0.0015; // Half speed for depth effect
            }
          }
          
          // Update comets
          cometsRef.current.forEach((comet, index) => {
            if (!comet || !comet.userData) return;
            
            // Move comet
            comet.position.add(comet.userData.velocity);
            
            // Update trail
            if (comet.userData.trail) {
              const positions = comet.userData.trail.geometry.attributes.position.array;
              // Shift trail positions
              for (let i = positions.length - 3; i >= 3; i -= 3) {
                positions[i] = positions[i - 3];
                positions[i + 1] = positions[i - 2];
                positions[i + 2] = positions[i - 1];
              }
              // Set new head position
              positions[0] = comet.position.x;
              positions[1] = comet.position.y;
              positions[2] = comet.position.z;
              comet.userData.trail.geometry.attributes.position.needsUpdate = true;
            }
            
            // Reset comet if it goes too far
            const distance = comet.position.length();
            if (distance > 200 || distance < 5) {
              // Remove old comet and trail
              if (sceneRef.current) {
                sceneRef.current.remove(comet);
                if (comet.userData.trail) {
                  sceneRef.current.remove(comet.userData.trail);
                }
              }
              // Create new comet
              const THREE = (window as any).THREE;
              if (THREE && sceneRef.current) {
                const newComet = createComet();
                cometsRef.current[index] = newComet;
              }
            }
          });
          
          if (controlsRef.current) {
            controlsRef.current.update();
          }
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        }
        animate();

        // Resize handler
        const handleResize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          if (cameraRef.current) {
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
          }
          if (rendererRef.current) {
            rendererRef.current.setSize(width, height);
            rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          }
        };
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          if (container && rendererRef.current && container.contains(rendererRef.current.domElement)) {
            container.removeChild(rendererRef.current.domElement);
          }
          if (rendererRef.current) {
            rendererRef.current.dispose();
          }
        };
      } catch (error) {
        console.error("Failed to initialize globe:", error);
      }
    }

    init();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update camera position and earth rotation based on scroll
  useEffect(() => {
    if (cameraRef.current && earthRef.current) {
      // Smooth zoom from far (20) to close (3.5)
      const startZ = 20;
      const endZ = 6;
      
      // Use easing function for smoother zoom
      const easeProgress = scrollProgress < 0.5 
        ? 2 * scrollProgress * scrollProgress 
        : 1 - Math.pow(-2 * scrollProgress + 2, 2) / 2;
      
      const newZ = startZ - (startZ - endZ) * easeProgress;
      
      // Smooth camera transition
      cameraRef.current.position.z = newZ;
      cameraRef.current.lookAt(0, 0, 0);
      
      // Handle rotation based on state
      if (scrollProgress > 0 && !hasInitialAnimationPlayed) {
        // User started scrolling, end initial animation
        setHasInitialAnimationPlayed(true);
        naturalRotationRef.current = earthRef.current.rotation.y;
      }
      
      if (hasInitialAnimationPlayed) {
        if (isScrolling) {
          // User is scrolling - lock rotation to scroll progress
          const targetRotation = scrollProgress * Math.PI * 2;
          earthRef.current.rotation.y = targetRotation;
          // Rotate stars with earth (half speed for depth)
          if (starsRef.current) {
            starsRef.current.rotation.y = targetRotation * 0.5;
          }
          naturalRotationRef.current = targetRotation;
          lastScrollProgressRef.current = scrollProgress;
        } else {
          // User stopped scrolling - continue natural rotation from current position
          naturalRotationRef.current += 0.002;
          earthRef.current.rotation.y = naturalRotationRef.current;
          // Rotate stars with earth
          if (starsRef.current) {
            starsRef.current.rotation.y = naturalRotationRef.current * 0.5;
          }
        }
      }
      // If hasInitialAnimationPlayed is false, rotation is handled in animate loop
    }
  }, [scrollProgress, isScrolling, hasInitialAnimationPlayed]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        background: "black",
        overflow: "hidden",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    />
  );
}
