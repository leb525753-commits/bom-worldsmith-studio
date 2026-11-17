import { Environment, Lightformer, OrbitControls, Sky, TransformControls, useHelper } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { KIND_HEIGHT } from "../catalog";
import { input, runtime, viewCenter } from "../runtime";
import { heldItem, stepPlay, TUNING, type Actor, type BlockState, type ItemState } from "../sim/play";
import { useStudio } from "../store";
import type { GameObject } from "../types";
import { ObjectToolbar } from "../ui/ObjectToolbar";
import {
  animateLimbs, Avatar, Baseplate, BushModel, House2Model, HouseModel, HpBar, PartModel, PotionModel, RoadModel,
  SwordBlade, SwordGroundModel, TreeModel, useLimbs,
} from "./models";

const registry = new Map<string, THREE.Object3D>();
const EMPTY: GameObject[] = [];
const F = new THREE.Vector3();
const R = new THREE.Vector3();
const M = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

const keyAxis = (a: string[], b: string[]) =>
  (a.some((k) => input.keys.has(k)) ? 1 : 0) - (b.some((k) => input.keys.has(k)) ? 1 : 0);

function flatBasis(camera: THREE.Camera) {
  camera.getWorldDirection(F);
  F.y = 0;
  if (F.lengthSq() < 1e-6) F.set(0, 0, -1);
  F.normalize();
  R.crossVectors(F, UP).normalize();
}

/* Edit camera: nav buttons / WASD-QE fly the orbit pivot and camera together. */
function EditRig() {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const mode = useStudio((s) => s.mode);
  useFrame((state, delta) => {
    if (!controls || mode !== "edit") return;
    const t = controls.target;
    viewCenter.x = t.x;
    viewCenter.z = t.z;
    const n = input.nav;
    const fwd = n.fwd - n.back + keyAxis(["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]);
    const right = n.right - n.left + keyAxis(["KeyD", "ArrowRight"], ["KeyA", "ArrowLeft"]);
    const up = n.up - n.down + keyAxis(["KeyE"], ["KeyQ"]);
    if (!fwd && !right && !up) return;
    const dt = Math.min(delta, 0.05);
    flatBasis(state.camera);
    M.set(0, 0, 0).addScaledVector(F, fwd).addScaledVector(R, right);
    M.y = up;
    M.multiplyScalar(16 * dt);
    state.camera.position.add(M);
    t.add(M);
    if (t.y < 0) {
      state.camera.position.y -= t.y;
      t.y = 0;
    }
    controls.update();
  });
  return null;
}

/* The single play stepper: input -> sim -> camera follow -> HUD sync. */
function PlayStepper() {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const session = useStudio((s) => s.session);
  useEffect(() => {
    const rt = runtime.current;
    if (!rt || !controls) return;
    const { x, z } = rt.player;
    controls.target.set(x, 1.4, z);
    camera.position.set(x, 8, z + 11);
    controls.update();
  }, [session, controls, camera]);

  useFrame((state, delta) => {
    const rt = runtime.current;
    if (!rt) return;
    const dt = Math.min(delta, 0.05);
    const fwd = keyAxis(["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]) + input.joy.y;
    const strafe = keyAxis(["KeyD", "ArrowRight"], ["KeyA", "ArrowLeft"]) + input.joy.x;
    flatBasis(state.camera);
    M.set(0, 0, 0).addScaledVector(F, fwd).addScaledVector(R, strafe);
    if (M.lengthSq() > 1) M.normalize();
    const px = rt.player.x;
    const pz = rt.player.z;
    const py = rt.player.y;
    stepPlay(rt, { x: M.x, z: M.z }, dt);
    const dx = rt.player.x - px;
    const dz = rt.player.z - pz;
    state.camera.position.x += dx;
    state.camera.position.z += dz;
    const dy = rt.player.y - py;
    state.camera.position.y += dy;
    if (controls) {
      controls.target.y += dy;
      controls.target.x += dx;
      controls.target.z += dz;
    }
    const st = useStudio.getState();
    const w = heldItem(rt);
    const h = st.hud;
    const next = { hp: rt.player.hp, holding: w?.kind ?? null, damage: w?.damage ?? 0, dead: !rt.player.alive, speed: rt.player.speed, money: rt.money };
    if (h.hp !== next.hp || h.holding !== next.holding || h.damage !== next.damage || h.dead !== next.dead || h.speed !== next.speed || h.money !== next.money) st.setHud(next);
  });
  return null;
}

const SPH = new THREE.Spherical();
const OFF = new THREE.Vector3();

/*
 * Drag-to-look for touch and mouse. OrbitControls listens to pointer moves on the whole page,
 * so a finger on the joystick / nav buttons was read as a camera drag and spun the view.
 * This only follows a pointer that went down on the 3D view itself, and only while it is the single one.
 */
function LookControls() {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const el = useThree((s) => s.gl.domElement);
  useEffect(() => {
    if (!controls) return;
    const down = new Map<number, { x: number; y: number }>();
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const onMove = (e: PointerEvent) => {
      const last = down.get(e.pointerId);
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      // Two fingers on the view = zoom/pan (OrbitControls); a gizmo drag disables controls.
      if (down.size !== 1 || !controls.enabled) return;
      const h = el.clientHeight || 1;
      OFF.copy(camera.position).sub(controls.target);
      SPH.setFromVector3(OFF);
      SPH.theta -= (2 * Math.PI * dx) / h;
      SPH.phi = Math.min(controls.maxPolarAngle, Math.max(0.05, SPH.phi - (2 * Math.PI * dy) / h));
      OFF.setFromSpherical(SPH);
      camera.position.copy(controls.target).add(OFF);
      camera.lookAt(controls.target);
    };
    const onUp = (e: PointerEvent) => {
      down.delete(e.pointerId);
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [controls, camera, el]);
  return null;
}

/* Swords / potions bought in the shop exist only in the play runtime; render them when dropped. */
function BoughtItems() {
  const [items, setItems] = useState<Array<{ id: string; kind: "sword" | "potion" }>>([]);
  useFrame(() => {
    const rt = runtime.current;
    if (!rt || rt.bought === items.length) return;
    setItems(rt.items.filter((w) => w.id.startsWith("shop:")).map((w) => ({ id: w.id, kind: w.kind })));
  });
  return (
    <>
      {items.map((it) => (
        <group key={it.id}>
          <ItemLive obj={{ id: it.id, kind: it.kind, position: [0, 0, 0], scale: [1, 1, 1], color: it.kind === "potion" ? "#e0457b" : "#c9ced6" }} />
        </group>
      ))}
    </>
  );
}

function useSelectable(obj: GameObject) {
  const select = useStudio((s) => s.select);
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (useStudio.getState().mode !== "edit" || e.delta > 8) return;
      e.stopPropagation();
      select(obj.id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (useStudio.getState().mode !== "edit") return;
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
    },
  };
}

function ObjectView({ obj, selected }: { obj: GameObject; selected: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const handlers = useSelectable(obj);
  const mode = useStudio((s) => s.mode);
  useHelper(selected ? (ref as React.RefObject<THREE.Object3D>) : false, THREE.BoxHelper, "#38b6ff");
  return (
    <group
      ref={(g) => {
        ref.current = g;
        if (g) registry.set(obj.id, g);
        else registry.delete(obj.id);
      }}
      position={obj.position}
      scale={obj.scale}
      {...handlers}
    >
      {obj.kind === "tree" && <TreeModel color={obj.color} />}
      {obj.kind === "house" && <HouseModel color={obj.color} />}
      {obj.kind === "road" && <RoadModel color={obj.color} />}
      {obj.kind === "bush" && <BushModel color={obj.color} />}
      {obj.kind === "part" && <PartModel color={obj.color} />}
      {obj.kind === "house2" && <House2Model color={obj.color} />}
      {obj.kind === "block" && <BlockLive obj={obj} />}
      {(obj.kind === "sword" || obj.kind === "potion") && <ItemLive obj={obj} />}
      {obj.kind === "npc" && <NpcLive obj={obj} groupRef={ref} />}
      {selected && mode === "edit" && <ObjectToolbar obj={obj} y={KIND_HEIGHT[obj.kind] + 0.3} />}
    </group>
  );
}

/* Block: blinks while a touched vanish-block counts down, hidden once gone. */
function BlockLive({ obj }: { obj: GameObject }) {
  const inner = useRef<THREE.Group>(null);
  const cache = useRef<BlockState | null>(null);
  useFrame((state) => {
    const rt = runtime.current;
    if (!rt || !inner.current) return;
    cache.current ??= rt.blocks.find((b) => b.id === obj.id) ?? null;
    const b = cache.current;
    if (!b) return;
    inner.current.visible = !b.gone && (b.timer < 0 || b.timer > 1.2 || Math.sin(state.clock.elapsedTime * 30) > 0);
  });
  return (
    <group ref={inner}>
      <PartModel color={obj.color} />
    </group>
  );
}

/* Ground sword / potion: hidden while carried, bobs in play so it reads as a pickup. */
function ItemLive({ obj }: { obj: GameObject }) {
  const inner = useRef<THREE.Group>(null);
  const cache = useRef<ItemState | null>(null);
  useFrame((state) => {
    const rt = runtime.current;
    const g = inner.current?.parent;
    if (!rt || !g || !inner.current) return;
    cache.current ??= rt.items.find((w) => w.id === obj.id) ?? null;
    const w = cache.current;
    if (!w) return;
    g.visible = !w.held && !w.used;
    g.position.set(w.x, obj.position[1], w.z);
    inner.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
    inner.current.rotation.y += 0.02;
  });
  return (
    <group ref={inner}>
      {obj.kind === "potion" ? <PotionModel color={obj.color} /> : <SwordGroundModel />}
    </group>
  );
}

const NPC_LOOK = {
  civilian: { skin: "#e9b98d", shirt: "#3f9c5b", pants: "#6b4a32" },
  monster: { skin: "#7d2a2a", shirt: "#3a1f2e", pants: "#24161d" },
};

function NpcLive({ obj, groupRef }: { obj: GameObject; groupRef: React.RefObject<THREE.Group | null> }) {
  const limbs = useLimbs();
  const cache = useRef<Actor | null>(null);
  const monster = obj.npcType === "monster";
  useFrame((state) => {
    const rt = runtime.current;
    const g = groupRef.current;
    if (!rt || !g) return;
    cache.current ??= rt.npcs.find((n) => n.id === obj.id) ?? null;
    const a = cache.current;
    if (!a) return;
    g.visible = a.alive;
    g.position.set(a.x, obj.position[1], a.z);
    g.rotation.y = a.yaw;
    animateLimbs(limbs.current, state.clock.elapsedTime + obj.position[0], a.moving, monster && a.attackCd > 0.75 ? (a.attackCd - 0.75) * 4 : 0);
  });
  const look = NPC_LOOK[monster ? "monster" : "civilian"];
  const s = monster ? 1.2 : 1;
  return (
    <>
      <group scale={s}>
        <Avatar limbs={limbs} {...look} monster={monster} />
      </group>
      <HpBar
        y={2.55 * s}
        ratio={() => {
          const a = cache.current;
          return a ? a.hp / a.maxHp : 1;
        }}
      />
    </>
  );
}

function PlayerView() {
  const ref = useRef<THREE.Group>(null);
  const limbs = useLimbs();
  const spawn = useStudio((s) => s.project?.player.position ?? ([0, 0, 4] as const));
  const holding = useStudio((s) => s.hud.holding);
  const mode = useStudio((s) => s.mode);
  useFrame((state) => {
    const rt = runtime.current;
    const g = ref.current;
    if (!g) return;
    if (!rt) {
      animateLimbs(limbs.current, 0, false);
      return;
    }
    const p = rt.player;
    g.visible = p.alive;
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.yaw;
    animateLimbs(limbs.current, state.clock.elapsedTime, p.moving, rt.swingT / TUNING.SWING_TIME);
  });
  return (
    <group ref={ref} position={[spawn[0], spawn[1], spawn[2]]}>
      <Avatar
        limbs={limbs}
        skin="#f5cd30"
        shirt="#1f6fd1"
        pants="#4caf50"
        rightHand={mode !== "play" || !holding ? null : holding === "sword" ? <SwordBlade /> : (
          <group position={[0, -0.75, 0.1]} scale={0.8}>
            <PotionModel />
          </group>
        )}
      />
      <HpBar
        y={2.6}
        ratio={() => {
          const p = runtime.current?.player;
          return p ? p.hp / p.maxHp : 1;
        }}
      />
    </group>
  );
}

function SelectionGizmo() {
  const selectedId = useStudio((s) => s.selectedId);
  const gizmo = useStudio((s) => s.gizmo);
  const mode = useStudio((s) => s.mode);
  const session = useStudio((s) => s.session);
  const update = useStudio((s) => s.update);
  const [target, setTarget] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    setTarget(selectedId ? (registry.get(selectedId) ?? null) : null);
  }, [selectedId, session]);
  if (!target || !selectedId || gizmo === "none" || mode !== "edit") return null;
  const r = (v: number) => Math.round(v * 100) / 100;
  return (
    <TransformControls
      object={target}
      mode={gizmo}
      size={0.9}
      onMouseUp={() => {
        const p = target.position;
        const s = target.scale;
        update(selectedId, {
          position: [r(p.x), r(Math.max(-0.5, p.y)), r(p.z)],
          scale: [r(Math.max(0.1, s.x)), r(Math.max(0.1, s.y)), r(Math.max(0.1, s.z))],
        });
      }}
    />
  );
}

function SkyAndLights() {
  return (
    <>
      <color attach="background" args={["#a9d8f5"]} />
      <fog attach="fog" args={["#cde6f7", 80, 260]} />
      <Sky distance={800} sunPosition={[80, 45, 30]} turbidity={4} rayleigh={1.6} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <hemisphereLight args={["#e3f3ff", "#5d5a50", 0.45]} />
      <directionalLight
        position={[30, 42, 18]}
        intensity={1.7}
        color="#fff1da"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={140}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <Environment resolution={64} environmentIntensity={0.55}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={1} color="#bfe0ff" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={0.8} color="#ffe2bf" position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
    </>
  );
}

export function World() {
  const objects = useStudio((s) => s.project?.objects ?? EMPTY);
  const session = useStudio((s) => s.session);
  const selectedId = useStudio((s) => s.selectedId);
  const mode = useStudio((s) => s.mode);
  return (
    <>
      <PlayStepper />
      <EditRig />
      <SkyAndLights />
      <Baseplate />
      <PlayerView key={`player:${session}`} />
      <BoughtItems key={`bought:${session}`} />
      <LookControls />
      {objects.map((o) => (
        <ObjectView key={`${o.id}:${session}`} obj={o} selected={o.id === selectedId} />
      ))}
      <SelectionGizmo />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enablePan={mode === "edit"}
        enableRotate={false}
        minDistance={3}
        maxDistance={90}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
    </>
  );
}
