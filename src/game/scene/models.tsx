import { Billboard } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
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

export function SwordGroundModel() {
  return (
    <group position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0.6]}>
      <SwordBlade />
    </group>
  );
}

/* 1 nút stud vuông dập nổi chuẩn Roblox: 1 ô texture = đúng 1 stud */
let cachedStudTexture: THREE.CanvasTexture | null = null;
function getStudTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (cachedStudTexture) return cachedStudTexture;

  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (!g) return null;

  // Nền xám trung tính (giữ nguyên màu part khi hòa trộn)
  g.fillStyle = "#888888";
  g.fillRect(0, 0, 128, 128);

  const size = 76;
  const ox = (128 - size) / 2;
  const oy = (128 - size) / 2;

  // Viền bóng tối đổ về góc dưới & phải (tạo chiều sâu 3D)
  g.fillStyle = "#333333";
  g.fillRect(ox + 4, oy + 4, size, size);

  // Viền sáng dập nổi ở góc trên & trái (tạo ánh sáng phản quang)
  g.fillStyle = "#e0e0e0";
  g.fillRect(ox, oy, size, size);

  // Mặt đỉnh nổi của nút stud vuông
  g.fillStyle = "#9a9a9a";
  g.fillRect(ox + 3, oy + 3, size - 6, size - 6);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.anisotropy = 4;
  cachedStudTexture = t;
  return t;
}

export function PartModel({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => getStudTexture(), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(2, 1, 2), []);
  const lastKey = useRef<string>("");
  const ws = useMemo(() => new THREE.Vector3(), []);

  // Tự động căn chỉnh toạ độ UV theo kích thước thực tế khi kéo dài
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.getWorldScale(ws);
    const sx = Math.max(0.01, ws.x);
    const sy = Math.max(0.01, ws.y);
    const sz = Math.max(0.01, ws.z);
    const key = sx.toFixed(2) + "_" + sy.toFixed(2) + "_" + sz.toFixed(2);
    if (key === lastKey.current) return;
    lastKey.current = key;

    // Kích thước thật trong không gian 3D
    const w = 2 * sx;
    const h = 1 * sy;
    const d = 2 * sz;

    const uv = geometry.attributes["uv"] as THREE.BufferAttribute | undefined;
    if (!uv) return;

    // 6 mặt của khối hộp: lặp studs đúng theo tỷ lệ 1 stud = 1 mét
    const dims: [number, number][] = [
      [d, h], // +X (phải)
      [d, h], // -X (trái)
      [w, d], // +Y (đỉnh)
      [w, d], // -Y (đáy)
      [w, h], // +Z (trước)
      [w, h], // -Z (sau)
    ];

    for (let f = 0; f < 6; f++) {
      const dim = dims[f];
      if (!dim) continue;
      const [fw, fh] = dim;
      const base = f * 4;
      uv.setXY(base + 0, 0, fh);
      uv.setXY(base + 1, fw, fh);
      uv.setXY(base + 2, 0, 0);
      uv.setXY(base + 3, fw, 0);
    }
    uv.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow position={[0, 0.5, 0]}>
      <meshStandardMaterial
        color={color}
        map={tex || null}
        bumpMap={tex || null}
        bumpScale={0.035}
        roughness={0.55}
      />
    </mesh>
  );
}

/* ------------------------------ Avatar ------------------------------ */

export interface Limbs {
  leftArm: THREE.Group | null;
  rightArm: THREE.Group | null;
  leftLeg: THREE.Group | null;
  rightLeg: THREE.Group | null;
}

export function useLimbs() {
  return useRef<Limbs>({ leftArm: null, rightArm: null, leftLeg: null, rightLeg: null });
}

export function animateLimbs(l: Limbs, t: number, moving: boolean, swing01 = 0) {
  const a = moving ? Math.sin(t * 10) * 0.7 : 0;
  const ease = (cur: number, want: number) => cur + (want - cur) * 0.3;
  if (l.leftLeg) l.leftLeg.rotation.x = ease(l.leftLeg.rotation.x, a);
  if (l.rightLeg) l.rightLeg.rotation.x = ease(l.rightLeg.rotation.x, -a);
  if (l.leftArm) l.leftArm.rotation.x = ease(l.leftArm.rotation.x, -a);
  if (l.rightArm) {
    const slash = swing01 > 0 ? -2.6 * Math.sin(swing01 * Math.PI) : 0;
    l.rightArm.rotation.x = swing01 > 0 ? slash : ease(l.rightArm.rotation.x, a);
  }
}

interface AvatarProps {
  limbs: RefObject<Limbs>;
  skin: string;
  shirt: string;
  pants: string;
  monster?: boolean;
  rightHand?: ReactNode;
}

function Limb({ color, ...props }: { color: string } & ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh castShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Avatar({ limbs, skin, shirt, pants, monster, rightHand }: AvatarProps) {
  const set = (k: keyof Limbs) => (g: THREE.Group | null) => {
    if (limbs.current) limbs.current[k] = g;
  };
  return (
    <group>
      <Limb ref={set("leftLeg")} color={pants} position={[-0.2, 0.8, 0]} />
      <Limb ref={set("rightLeg")} color={pants} position={[0.2, 0.8, 0]} />
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.4]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>
      <Limb ref={set("leftArm")} color={skin} position={[-0.6, 1.6, 0]} />
      <group ref={set("rightArm")} position={[0.6, 1.6, 0]}>
        <mesh castShadow position={[0, -0.4, 0]}>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {rightHand && (
          <group position={[0, -0.78, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            {rightHand}
          </group>
        )}
      </group>
      <mesh castShadow position={[0, 1.88, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.55, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 1.95, 0.295]}>
          <boxGeometry args={[0.06, monster ? 0.06 : 0.11, 0.02]} />
          <meshStandardMaterial
            color={monster ? "#ffd23a" : "#111111"}
            emissive={monster ? "#ffb000" : "#000000"}
            emissiveIntensity={monster ? 1.4 : 0}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.8, 0.295]}>
        <boxGeometry args={[monster ? 0.24 : 0.16, 0.035, 0.02]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {monster &&
        [-0.17, 0.17].map((x) => (
          <mesh key={x} castShadow position={[x, 2.28, 0]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]}>
            <coneGeometry args={[0.07, 0.3, 6]} />
            <meshStandardMaterial color="#e8e2cf" roughness={0.5} />
          </mesh>
        ))}
    </group>
  );
}

/* ------------------------------ HP bar ------------------------------ */

const BAR_W = 1.3;
const BAR_H = 0.15;
const C_HIGH = new THREE.Color("#3fd46b");
const C_MID = new THREE.Color("#f2c335");
const C_LOW = new THREE.Color("#ef4b3f");

export function HpBar({ y, ratio }: { y: number; ratio: () => number }) {
  const fill = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const r = Math.max(0, Math.min(1, ratio()));
    if (fill.current) {
      fill.current.scale.x = Math.max(r, 0.0001);
      fill.current.position.x = (-(1 - r) * BAR_W) / 2;
    }
    mat.current?.color.copy(r > 0.5 ? C_HIGH : r > 0.25 ? C_MID : C_LOW);
  });
  return (
    <Billboard position={[0, y, 0]}>
      <mesh renderOrder={10}>
        <planeGeometry args={[BAR_W + 0.08, BAR_H + 0.08]} />
        <meshBasicMaterial color="#14161a" transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={fill} position={[0, 0, 0.002]} renderOrder={11}>
        <planeGeometry args={[BAR_W, BAR_H]} />
        <meshBasicMaterial ref={mat} color={C_HIGH} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

/* ------------------------------ Baseplate ------------------------------ */

export function Baseplate() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#6c7077";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = 100 + Math.floor(Math.random() * 18);
      g.fillStyle = "rgba(" + v + "," + (v + 3) + "," + (v + 8) + ",0.35)";
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = "#53575d";
    g.lineWidth = 6;
    g.strokeRect(0, 0, 256, 256);
    g.strokeStyle = "#787c83";
    g.lineWidth = 2;
    g.strokeRect(6, 6, 244, 244);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 30);
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <mesh receiveShadow position={[0, -0.5, 0]}>
      <boxGeometry args={[120, 1, 120]} />
      <meshStandardMaterial map={tex} roughness={0.92} />
    </mesh>
  );
}

/* ------------------------------ New models ------------------------------ */

const GLASS = { color: "#9fd6ff", emissive: "#3a6f99", emissiveIntensity: 0.25, roughness: 0.2 } as const;

export function House2Model({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 2.6, 0]}>
        <boxGeometry args={[4, 5.2, 4]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 2.65, 0]}>
        <boxGeometry args={[4.12, 0.18, 4.12]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.8} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 6.1, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.25, 1.8, 4]} />
        <meshStandardMaterial color="#2f5f8a" roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.85, 2.01]}>
        <boxGeometry args={[0.95, 1.7, 0.06]} />
        <meshStandardMaterial color="#6b4428" roughness={0.8} />
      </mesh>
      {[1.55, 4].flatMap((y) =>
        [-1.25, 1.25].map((x) => (
          <mesh key={x + ":" + y} position={[x, y, 2.01]}>
            <boxGeometry args={[0.75, 0.75, 0.06]} />
            <meshStandardMaterial {...GLASS} />
          </mesh>
        )),
      )}
      <mesh position={[0, 4, 2.01]}>
        <boxGeometry args={[0.75, 0.75, 0.06]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      {[1.55, 4].flatMap((y) =>
        [-2.01, 2.01].map((x) => (
          <mesh key={"s" + x + ":" + y} position={[x, y, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.9, 0.75, 0.06]} />
            <meshStandardMaterial {...GLASS} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function PotionModel({ color = "#e0457b" }: { color?: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.22, 20, 14]} />
        <meshPhysicalMaterial color="#dff3ff" transmission={0.6} roughness={0.08} thickness={0.2} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.17, 18, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.2, 12]} />
        <meshPhysicalMaterial color="#dff3ff" transmission={0.6} roughness={0.08} />
      </mesh>
      <mesh position={[0, 0.63, 0]}>
        <cylinderGeometry args={[0.08, 0.07, 0.08, 12]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.9} />
      </mesh>
    </group>
  );
                 }
  
