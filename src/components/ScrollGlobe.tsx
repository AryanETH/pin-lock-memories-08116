import { useEffect, useRef } from "react";

interface ScrollGlobeProps {
  scrollProgress: number;
}

export default function ScrollGlobe({ scrollProgress }: ScrollGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<any>(null);
  const earthRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });

    async function init() {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
      await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");

      const THREE = (window as any).THREE;
      const container = containerRef.current;
      if (!container) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      cameraRef.current = camera;
      
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 1);
      container.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambientLight);
      const light = new THREE.DirectionalLight(0xffffff, 1.2);
      light.position.set(5, 3, 5).normalize();
      scene.add(light);

      // Earth
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load(
        "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg"
      );
      const earthGeo = new THREE.SphereGeometry(2, 64, 64);
      const earthMat = new THREE.MeshPhongMaterial({ map: earthTexture });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      earthRef.current = earth;
      scene.add(earth);

      // Stars
      const starVertices: number[] = [];
      for (let i = 0; i < 15000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starVertices.push(x, y, z);
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
      const starMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 1.5, 
        transparent: true, 
        opacity: 0.8 
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Controls
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controlsRef.current = controls;

      // Initial camera position (very far away)
      camera.position.set(0, 0, 15);
      camera.lookAt(0, 0, 15);

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        
        // Earth rotation is now controlled by scroll progress
        // No auto-rotation here
        
        renderer.render(scene, camera);
      }
      animate();

      // Cleanup
      const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (container && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    }

    init();
  }, []);

  // Update camera position and earth rotation based on scroll
  useEffect(() => {
    if (cameraRef.current && earthRef.current) {
      // Zoom from very far (50) to very close (2.2) as user scrolls
      const startZ = 15;
      const endZ = 3;
      const newZ = startZ - (startZ - endZ) * scrollProgress;
      
      // Smooth transition
      cameraRef.current.position.z = newZ;
      cameraRef.current.lookAt(0, 0, 0);
      
      // Rotate Earth based on scroll progress
      earthRef.current.rotation.y = scrollProgress * Math.PI * 4; // 2 full rotations
      
      // Increase rotation speed as we zoom in
      if (controlsRef.current) {
        controlsRef.current.autoRotateSpeed = 0.3 + scrollProgress * 1.2;
      }
    }
  }, [scrollProgress]);

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
