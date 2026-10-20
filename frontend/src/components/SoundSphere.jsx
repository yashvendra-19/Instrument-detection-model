import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// 3D simplex noise — Ashima Arts / Stefan Gustavson (MIT licence).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertex = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uSize;
varying float vNoise; varying vec3 vPos;
${NOISE}
void main(){
  float n = snoise(position * 1.1 + vec3(uTime * 0.25));
  float n2 = snoise(position * 3.0 - vec3(uTime * 0.6));
  float disp = n * (0.16 + uLevel * 0.55) + n2 * (0.03 + uLevel * 0.18);
  vec3 p = position + normal * disp;
  vNoise = n; vPos = p;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (1.0 + uLevel * 1.4) * (3.2 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
varying float vNoise; varying vec3 vPos;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  if (d > 0.5) discard;
  float t = clamp(vPos.y * 0.32 + 0.5 + vNoise * 0.25, 0.0, 1.0);
  vec3 col = t < 0.5 ? mix(uA, uB, t * 2.0) : mix(uB, uC, (t - 0.5) * 2.0);
  float alpha = smoothstep(0.5, 0.0, d) * (0.55 + vNoise * 0.35);
  gl_FragColor = vec4(col, alpha);
}`;

function ParticleSphere({ levelRef, detail }) {
  const mat = useRef();
  const group = useRef();
  const geom = useMemo(() => new THREE.IcosahedronGeometry(1.55, detail), [detail]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uLevel: { value: 0 }, uSize: { value: 5.5 },
    uA: { value: new THREE.Color("#22d3ee") }, uB: { value: new THREE.Color("#8b5cf6") }, uC: { value: new THREE.Color("#e94cc4") },
  }), []);
  useFrame((state, dt) => {
    const lvl = levelRef?.current || 0;
    uniforms.uTime.value += dt;
    uniforms.uLevel.value += (lvl - uniforms.uLevel.value) * 0.15;
    const g = group.current;
    g.rotation.y += dt * (0.12 + lvl * 0.6);
    // ease toward the cursor for a parallax feel
    g.rotation.x += (state.pointer.y * 0.35 - g.rotation.x) * 0.04;
    g.rotation.z += (-state.pointer.x * 0.25 - g.rotation.z) * 0.04;
    const s = 1 + uniforms.uLevel.value * 0.12;
    g.scale.setScalar(s);
  });
  return (
    <group ref={group}>
      <points geometry={geom}>
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.72, 48, 48]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function Rings() {
  const a = useRef(), b = useRef(), c = useRef();
  useFrame((_, dt) => {
    a.current.rotation.z += dt * 0.25;
    b.current.rotation.z -= dt * 0.18;
    c.current.rotation.y += dt * 0.12;
  });
  return (
    <group rotation={[1.15, 0.2, 0]}>
      <mesh ref={a}><torusGeometry args={[2.25, 0.006, 8, 160]} /><meshBasicMaterial color="#22d3ee" transparent opacity={0.55} /></mesh>
      <mesh ref={b} rotation={[0.35, 0.4, 0]}><torusGeometry args={[2.55, 0.004, 8, 160]} /><meshBasicMaterial color="#e94cc4" transparent opacity={0.4} /></mesh>
      <mesh ref={c} rotation={[1.2, 0, 0.3]}><torusGeometry args={[2.0, 0.003, 8, 160]} /><meshBasicMaterial color="#f5b544" transparent opacity={0.35} /></mesh>
    </group>
  );
}

export default function SoundSphere({ levelRef, className = "", detail = 24, rings = true, sparkles = true }) {
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const wrap = useRef(null);
  const [visible, setVisible] = useState(true);
  // Stop rendering while the sphere is scrolled off-screen or the tab is hidden.
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className={`sound-sphere ${className}`} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 6.2], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        frameloop={reduced ? "demand" : visible ? "always" : "never"}>
        <ParticleSphere levelRef={levelRef} detail={detail} />
        {rings && <Rings />}
        {sparkles && <Sparkles count={70} scale={[7, 5, 4]} size={2.2} speed={0.35} color="#a5b4fc" opacity={0.7} />}
      </Canvas>
    </div>
  );
}
