"use client";

import { Center, Environment, Float } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { SVGLoader } from "three-stdlib";

const TARGET_SIZE = 1.8;

const extrudeSettings: THREE.ExtrudeGeometryOptions = {
  depth: 0.7,
  bevelEnabled: true,
  bevelThickness: 0.04,
  bevelSize: 0.02,
  bevelSegments: 3,
};

function EmeraldMaterial() {
  return (
    <meshPhysicalMaterial
      color="#0bc275"
      emissive="#004d2e"
      emissiveIntensity={0.2}
      metalness={0.9}
      roughness={0.15}
      clearcoat={1}
      clearcoatRoughness={0.1}
    />
  );
}

function Coin({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.5, 0.5, 0.12, 64]} />
      <meshPhysicalMaterial
        attach="material-0"
        color="#0bc275"
        emissive="#004d2e"
        emissiveIntensity={0.2}
        metalness={0.9}
        roughness={0.15}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
      <meshBasicMaterial attach="material-1" color="#0bc275" toneMapped={false} />
      <meshBasicMaterial attach="material-2" color="#078f56" toneMapped={false} />
    </mesh>
  );
}

function remapShape(shape: THREE.Shape, center: THREE.Vector2, scale: number) {
  const remap = (points: THREE.Vector2[]) =>
    points.map(
      (point) =>
        new THREE.Vector2((point.x - center.x) * scale, (center.y - point.y) * scale),
    );

  const next = new THREE.Shape(remap(shape.getPoints()));
  for (const hole of shape.holes) {
    next.holes.push(new THREE.Path(remap(hole.getPoints())));
  }
  return next;
}

function LogoMark() {
  const svg = useLoader(SVGLoader, "/simbolo.svg");

  const { shapes, coinAnchor } = useMemo(() => {
    const rawShapes = svg.paths.flatMap((path) => path.toShapes(true));
    const box = new THREE.Box3();

    for (const shape of rawShapes) {
      for (const point of shape.getPoints()) {
        box.expandByPoint(new THREE.Vector3(point.x, point.y, 0));
      }
    }

    const size = new THREE.Vector3();
    const center3 = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center3);

    const center = new THREE.Vector2(center3.x, center3.y);
    const scale = TARGET_SIZE / Math.max(size.x, size.y);
    const shapes = rawShapes.map((shape) => remapShape(shape, center, scale));
    const right = (box.max.x - center.x) * scale;
    const bottom = (center.y - box.max.y) * scale;
    const depth = extrudeSettings.depth ?? 0.7;

    return {
      shapes,
      coinAnchor: {
        x: right - 0.4,
        y: bottom + 0.18,
        z: depth + 0.2,
      },
    };
  }, [svg]);

  return (
    <Float
      speed={1.7}
      rotationIntensity={0.35}
      floatIntensity={1.25}
      floatingRange={[-0.12, 0.12]}
    >
      <Center>
        <group>
          {shapes.map((shape, index) => (
            <mesh key={index}>
              <extrudeGeometry args={[shape, extrudeSettings]} />
              <EmeraldMaterial />
            </mesh>
          ))}

          <group
            position={[coinAnchor.x, coinAnchor.y, coinAnchor.z]}
            rotation={[0.32, 0.42, 0.04]}
            scale={0.34}
          >
            <Coin position={[0, 0, 0]} />
            <Coin position={[0, 0.14, 0]} />
            <Coin position={[0, 0.28, 0]} />
            <Coin position={[0.95, 0.15, 0.15]} rotation={[0.3, 0.1, -0.4]} />
          </group>
        </group>
      </Center>
    </Float>
  );
}

export default function Logo3D() {
  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: [0, 0.15, 5.6], fov: 36 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.25;
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 2]} intensity={3} color="#a7f3d0" />
      <directionalLight position={[-5, -5, 2]} intensity={1} color="#064e3b" />
      <Environment preset="city" />
      <LogoMark />
    </Canvas>
  );
}
