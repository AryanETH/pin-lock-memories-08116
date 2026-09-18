import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

type SceneProps = {
  active: boolean;
  reducedMotion: boolean;
};

function useCompactScene() {
  const [compact, setCompact] = useState(() => window.innerWidth < 760);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 759px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return compact;
}

function FloatingMedia({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const textures = useLoader(THREE.TextureLoader, [
    '/screenshots/weather-map.png',
    '/screenshots/photo-vault.png',
    '/screenshots/app-lock.png',
    '/screenshots/secret-map.png',
  ]);

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    });
  }, [textures]);

  const cards: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  }> = [
    { position: [-2.15, 1.12, 1.05], rotation: [-0.08, 0.28, -0.2], scale: 0.63 },
    { position: [2.38, 1.32, 0.86], rotation: [0.04, -0.32, 0.18], scale: 0.58 },
    { position: [-2.48, -1.22, 1.2], rotation: [0.1, 0.32, 0.22], scale: 0.55 },
    { position: [2.05, -1.38, 1.18], rotation: [-0.12, -0.27, -0.13], scale: 0.58 },
  ];

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    const time = clock.getElapsedTime();
    group.current.children.forEach((child, index) => {
      child.position.y += Math.sin(time * 0.8 + index * 1.4) * 0.0008;
      child.rotation.z += Math.sin(time * 0.45 + index) * 0.0003;
    });
  });

  return (
    <group ref={group}>
      {cards.map((card, index) => (
        <mesh
          key={textures[index].uuid}
          position={card.position}
          rotation={card.rotation}
          scale={card.scale}
        >
          <planeGeometry args={[1, 1.45]} />
          <meshStandardMaterial
            map={textures[index]}
            roughness={0.28}
            metalness={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function PortalLock({ mix }: { mix: MutableRefObject<number> }) {
  const portal = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!portal.current || !ring.current) return;
    const reveal = mix.current;
    portal.current.position.z = 0.58 - reveal * 1.34;
    portal.current.scale.setScalar(0.82 + reveal * 0.22);
    ring.current.rotation.z = clock.getElapsedTime() * 0.22;
  });

  return (
    <group ref={portal} position={[0.35, -0.05, 0.1]}>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.055, 18, 72]} />
        <meshStandardMaterial color="#198cff" emissive="#116fff" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.025, 12, 64]} />
        <meshStandardMaterial color="#77c9ff" emissive="#118dff" emissiveIntensity={4} toneMapped={false} />
      </mesh>
      <RoundedBox args={[0.44, 0.36, 0.18]} radius={0.08} smoothness={5} position={[0, -0.08, 0.1]}>
        <meshStandardMaterial color="#06101f" metalness={0.75} roughness={0.18} />
      </RoundedBox>
      <mesh position={[0, 0.18, 0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.12, 1]}>
        <torusGeometry args={[0.16, 0.045, 14, 32, Math.PI]} />
        <meshStandardMaterial color="#55bbff" emissive="#087cff" emissiveIntensity={4} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.09, 0.205]}>
        <sphereGeometry args={[0.045, 18, 18]} />
        <meshBasicMaterial color="#36a8ff" toneMapped={false} />
      </mesh>
      <pointLight color="#168cff" intensity={9} distance={4.5} decay={2} />
    </group>
  );
}

function MapCloth({ active, reducedMotion }: SceneProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const reveal = useRef(0.36);
  const frame = useRef(0);
  const texture = useLoader(THREE.TextureLoader, '/visuals/night-map-texture.png');
  const compact = useCompactScene();
  const { pointer } = useThree();
  const geometry = useMemo(() => new THREE.PlaneGeometry(7.7, 5.35, 58, 42), []);
  const basePositions = useMemo(
    () => Float32Array.from(geometry.attributes.position.array as ArrayLike<number>),
    [geometry],
  );

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.08, 1.08);
    texture.anisotropy = 12;
    return () => geometry.dispose();
  }, [geometry, texture]);

  useFrame(({ clock }) => {
    if (!mesh.current || !group.current) return;
    reveal.current = THREE.MathUtils.lerp(reveal.current, active ? 1 : 0.36, reducedMotion ? 1 : 0.045);
    const time = reducedMotion ? 0.8 : clock.getElapsedTime();
    const positions = geometry.attributes.position as THREE.BufferAttribute;

    for (let index = 0; index < positions.count; index += 1) {
      const x = basePositions[index * 3];
      const y = basePositions[index * 3 + 1];
      const radius = Math.hypot(x - 0.35, y + 0.05);
      const funnel = -2.28 * reveal.current * Math.exp(-radius * radius * 0.82);
      const fabric = Math.sin(x * 1.34 + time * 0.33) * 0.26
        + Math.cos(y * 1.88 - time * 0.26) * 0.2
        + Math.sin((x + y) * 2.18) * 0.12;
      const edgeLift = Math.pow(Math.min(1, radius / 3.8), 2) * 0.34;
      positions.setZ(index, fabric + funnel + edgeLift);
    }

    positions.needsUpdate = true;
    frame.current += 1;
    if (frame.current % 3 === 0) geometry.computeVertexNormals();
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.13, 0.035);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -0.34 + pointer.y * 0.055, 0.035);
    group.current.rotation.z = -0.11 + Math.sin(time * 0.17) * 0.02;
  });

  return (
    <group
      ref={group}
      position={compact ? [0.25, -0.78, 0] : [1.42, 0.08, 0]}
      scale={compact ? 0.63 : 1}
    >
      <mesh ref={mesh} geometry={geometry}>
        <meshStandardMaterial
          map={texture}
          roughness={0.34}
          metalness={0.42}
          side={THREE.DoubleSide}
        />
      </mesh>
      <PortalLock mix={reveal} />
      <FloatingMedia reducedMotion={reducedMotion} />
    </group>
  );
}

function Fragments({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => [
    [-3.5, 2.4, -0.5], [3.5, 2.1, 0.2], [3.9, -1.7, 0.5], [-2.8, -2.2, -0.1], [0.5, 2.75, -0.8],
  ], []);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.z = clock.getElapsedTime() * 0.025;
    group.current.children.forEach((child, index) => {
      child.rotation.x += 0.0013 + index * 0.00012;
      child.rotation.y += 0.0017;
    });
  });

  return (
    <group ref={group}>
      {positions.map((position, index) => (
        <mesh key={position.join('-')} position={position as [number, number, number]} scale={0.12 + index * 0.025}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#1b2738" roughness={0.32} metalness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ active, reducedMotion }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-4, 5, 7]} color="#b9dcff" intensity={2.4} />
      <directionalLight position={[5, -2, 4]} color="#166dff" intensity={2.8} />
      <Fragments reducedMotion={reducedMotion} />
      <MapCloth active={active} reducedMotion={reducedMotion} />
    </>
  );
}

export default function MapPortalScene({ active = false }: { active?: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7.8], fov: 46 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <Scene active={active} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}
