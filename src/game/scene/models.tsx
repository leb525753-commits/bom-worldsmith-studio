import { Billboard } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";

/* Roblox-style blocky models built from primitives so they can be stretched per axis. */

const APPLE_SPOTS: Array<[number, number, number]> = Array.from({ length: 9 }, (_, i) => {
  const a = i * 2.39996;
  const yy = 0.55 - (i / 8) * 1.1;
  const r = Math.sqrt(1 - yy * yy) * 1.38;
  return [Math.cos(a) * r, 3 + yy * 1.25, Math.sin(a) * r];
});

export function TreeModel({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.26, 0.36, 2.2, 7]} />
        <meshStandardMaterial color="#7a4f2d" roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 3, 0]}>
        <dodecahedronGeometry args={[1.45, 0]} />
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>
      <mesh castShadow position={[0.55, 3.75, -0.2]}>
        <dodecahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>
      {APPLE_SPOTS.map((p, i) => (
        <mesh key={i} castShadow position={p}>
          <sphereGeometry args={[0.17, 10, 8]} />
          <meshStandardMaterial color="#d7262b" roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export function HouseModel({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.3, 0]}>
        <boxGeometry args={[4, 2.6, 4]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 3.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.25, 1.8, 4]} />
        <meshStandardMaterial color="#b8322a" roughness={0.7} flatShading />
      </mesh>
      <mesh castShadow position={[1.1, 3.9, 0.5]}>
        <boxGeometry args={[0.45, 1, 0.45]} />
        <meshStandardMaterial color="#8a8d91" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 2.01]}>
        <boxGeometry args={[0.95, 1.7, 0.06]} />
        <meshStandardMaterial color="#6b4428" roughness={0.8} />
      </mesh>
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 1.55, 2.01]}>
          <boxGeometry args={[0.75, 0.75, 0.06]} />
          <meshStandardMaterial color="#9fd6ff" emissive="#3a6f99" emissiveIntensity={0.25} roughness={0.2} />
        </mesh>
      ))}
      {[-2.01, 2.01].map((x) => (
        <mesh key={x} position={[x, 1.55, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.9, 0.75, 0.06]} />
          <meshStandardMaterial color="#9fd6ff" emissive="#3a6f99" emissiveIntensity={0.25} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function RoadModel({ color }: { color: string }) {
  return (
    <group>
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[3, 0.08, 8]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {[-3, -1, 1, 3].map((z) => (
        <mesh key={z} position={[0, 0.085, z]}>
          <boxGeometry args={[0.14, 0.01, 1]} />
          <meshStandardMaterial color="#f1f1ea" roughness={0.6} />
        </mesh>
      ))}
      {[-1.56, 1.56].map((x) => (
        <mesh key={x} receiveShadow position={[x, 0.07, 0]}>
          <boxGeometry args={[0.14, 0.14, 8]} />
          <meshStandardMaterial color="#b9bcc0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function BushModel({ color }: { color: string }) {
  const blobs: Array<[number, number, number, number]> = [
    [0, 0.55, 0, 0.72],
    [0.6, 0.42, 0.2, 0.55],
    [-0.55, 0.4, -0.1, 0.58],
    [0.1, 0.4, -0.55, 0.5],
  ];
  return (
    <group>
      {blobs.map(([x, y, z, r], i) => (
        <mesh key={i} castShadow receiveShadow position={[x, y, z]}>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Vertical sword with the grip centered at the origin. */
export function SwordBlade() {
  return (
    <group>
      <mesh castShadow position={[0, -0.22, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#d4a72c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.38, 8]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[0.5, 0.07, 0.11]} />
        <meshStandardMaterial color="#d4a72c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.86, 0]}>
        <boxGeometry args={[0.11, 1.2, 0.03]} />
        <meshStandardMaterial color="#dfe4ea" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.078, 0.12, 4]} />
        <meshStandardMaterial color="#dfe4ea" metalness={0.85} roughness={0.18} />
      </mesh>
    </group>
  );
}
