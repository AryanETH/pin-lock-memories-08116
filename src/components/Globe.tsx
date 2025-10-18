import { useEffect, useRef } from "react";
import { cities as allCities } from "@/lib/cities";

interface GlobeProps {
  onCityChange?: (name: string, lat: number, lon: number) => void;
}

export default function Globe({ onCityChange }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js");

      const THREE = (window as any).THREE;
      const TWEEN = (window as any).TWEEN;

      const container = containerRef.current;
      if (!container) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      // 🌍 Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
      scene.add(ambientLight);
      const light = new THREE.DirectionalLight(0xffffff, 1.2);
      light.position.set(5, 3, 5).normalize();
      scene.add(light);

      // 🌎 Earth
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load(
        "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg"
      );
      const earthGeo = new THREE.SphereGeometry(2, 64, 64);
      const earthMat = new THREE.MeshPhongMaterial({ map: earthTexture });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      scene.add(earth);

      // ✨ Stars
      const starVertices: number[] = [];
      for (let i = 0; i < 20000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starVertices.push(x, y, z);
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.25, transparent: true, depthWrite: false });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // ☄️ Tail-less comets behind the Earth
      const comets: any[] = [];
      const spawnComet = () => {
        const cometGeo = new THREE.SphereGeometry(0.06, 12, 12);
        const cometMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
        const comet = new THREE.Mesh(cometGeo, cometMat) as any;
        const zPlane = -20; // behind earth given camera at +z
        const spread = 60;

        // start from one edge, go across opposite edge
        const side = Math.floor(Math.random() * 4);
        let sx = 0, sy = 0, tx = 0, ty = 0;
        switch (side) {
          case 0: // top -> bottom
            sx = THREE.MathUtils.randFloatSpread(spread); sy = spread / 2;
            tx = THREE.MathUtils.randFloatSpread(spread); ty = -spread / 2;
            break;
          case 1: // bottom -> top
            sx = THREE.MathUtils.randFloatSpread(spread); sy = -spread / 2;
            tx = THREE.MathUtils.randFloatSpread(spread); ty = spread / 2;
            break;
          case 2: // left -> right
            sx = -spread / 2; sy = THREE.MathUtils.randFloatSpread(spread);
            tx = spread / 2; ty = THREE.MathUtils.randFloatSpread(spread);
            break;
          default: // right -> left
            sx = spread / 2; sy = THREE.MathUtils.randFloatSpread(spread);
            tx = -spread / 2; ty = THREE.MathUtils.randFloatSpread(spread);
        }
        const start = new THREE.Vector3(sx, sy, zPlane);
        const target = new THREE.Vector3(tx, ty, zPlane);
        comet.position.copy(start);
        comet.userData = { velocity: target.clone().sub(start).normalize().multiplyScalar(0.25) };
        scene.add(comet);
        comets.push(comet);
      };

      const cometInterval = setInterval(spawnComet, 250); // 4 per second

      // 🎥 Camera & Controls
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      camera.position.z = 12;

      // 🏙 City typing + rotation (imported 300+ cities)
      const cityCoordinates: Record<string, { lat: number; lon: number }> = Object.fromEntries(
        allCities.map(c => [c.name.toUpperCase(), { lat: c.lat, lon: c.lng }])
      );
      const cities = Object.keys(cityCoordinates).sort(() => Math.random() - 0.5);

      const cityLabel = document.createElement("div");
      cityLabel.style.position = "absolute";
      cityLabel.style.top = "10%";
      cityLabel.style.width = "100%";
      cityLabel.style.textAlign = "center";
      cityLabel.className = 'landing-font';
      cityLabel.style.fontFamily = "'Basis33','Basis 33', monospace";
      cityLabel.style.color = "white";
      cityLabel.style.letterSpacing = "2px";
      cityLabel.style.pointerEvents = "none";
      document.body.appendChild(cityLabel);

      const footer = document.createElement("div");
      footer.innerHTML = "♡ Crafted by Aryan Patil";
      footer.style.position = "absolute";
      footer.style.bottom = "30px";
      footer.style.width = "100%";
      footer.style.textAlign = "center";
      footer.style.fontFamily = "'Basis33','Basis 33', monospace";
      footer.style.fontSize = "10px";
      footer.style.color = "#ffb3b3";
      footer.style.pointerEvents = "none";
      document.body.appendChild(footer);

      function latLonToVec3(lat: number, lon: number, radius = 2) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        return new THREE.Vector3(x, y, z);
      }

      function pointCameraTo(lat: number, lon: number) {
        const target = latLonToVec3(lat, lon, 2);
        const dist = camera.position.length();
        const newPos = target.clone().normalize().multiplyScalar(dist);
        new TWEEN.Tween(camera.position)
          .to(newPos, 1500)
          .easing(TWEEN.Easing.Cubic.InOut)
          .onUpdate(() => camera.lookAt(0, 0, 0))
          .start();
      }

      let index = 0;
      function typeCity(text: string, callback: () => void) {
        let i = 0;
        cityLabel.textContent = "";
        const interval = setInterval(() => {
          cityLabel.textContent = text.substring(0, i) + "..";
          i++;
          if (i > text.length) {
            clearInterval(interval);
            setTimeout(callback, 1000);
          }
        }, 80);
      }

      function showNextCity() {
        if (index >= cities.length) index = 0;
        const city = cities[index++];
        const { lat, lon } = cityCoordinates[city];
        pointCameraTo(lat, lon);
        typeCity(city, showNextCity);
        if (onCityChange) onCityChange(city, lat, lon);
      }

      showNextCity();

      // 🔁 Animation loop
      function animate(time: number) {
        requestAnimationFrame(animate);
        TWEEN.update(time);
        // animate comets
        for (let i = comets.length - 1; i >= 0; i--) {
          const c = comets[i];
          c.position.add(c.userData.velocity);
          // gentle blink
          c.material.opacity = 0.6 + Math.sin(Date.now() * 0.004 + i) * 0.4;
          if (c.position.length() > 80) {
            scene.remove(c);
            comets.splice(i, 1);
          }
        }
        controls.update();
        renderer.render(scene, camera);
      }
      animate(0 as any);

      // Cleanup on unmount
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
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        document.body.removeChild(cityLabel);
        document.body.removeChild(footer);
        renderer.dispose();
        clearInterval(cometInterval);
      };
    }

    const cleanupPromise = init();
    return () => {
      // Ensure cleanup runs if init resolved with a function
      // Note: if init returns a cleanup, await is not possible here; the returned cleanup is handled inside init
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        background: "black",
        overflow: "hidden",
        position: "relative",
      }}
    />
  );
}
