"use client";

import React, { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScrollControls, useScroll, useTexture, Float, Html, Text, MeshReflectorMaterial, Environment } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

const engines = [
  { name: "Scheme Eligibility Engine", desc: "Find government schemes and eligibility.", color: "#4f46e5", icon: "🏛️" },
  { name: "ANNADATA", desc: "Farmer AI with crop prices and weather alerts.", color: "#f59e0b", icon: "🌾" },
  { name: "NYAYA", desc: "Legal rights assistant for complaints and RTI.", color: "#8b5cf6", icon: "⚖️" },
  { name: "UDYOG", desc: "Micro-business mentor for loans and registration.", color: "#06b6d4", icon: "🏪" },
  { name: "GLOBALSELLER AI", desc: "AI assistant for global e-commerce selling.", color: "#3b82f6", icon: "🌍" },
  { name: "ATITHI AI", desc: "AI travel and cultural guide for India.", color: "#0d9488", icon: "🧳" }
];

function WaterReflection() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[100, 100]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={25}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#fdfbf7"
        metalness={0.2}
        mirror={0.8}
      />
    </mesh>
  );
}

function SceneManager() {
  const scroll = useScroll();
  const { camera } = useThree();

  const logoRef = useRef<THREE.Group>(null!);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  // Use the exact uploaded image
  const logoTexture = useTexture("/BUAIP_logo.png");
  if (logoTexture) {
    logoTexture.colorSpace = THREE.SRGBColorSpace;
  }

  useFrame((state) => {
    // Keep camera static as requested ("logo stays in the center")
    camera.position.z = 11;
  });

  return (
    <>
      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight position={[0, 10, 5]} intensity={2.0} color="#ffffff" />

      {/* Hero Background Elements - BUAIP Giant Typography */}
      <group position={[0, 0, -8]}>
        <Text
          fontSize={16}
          color="#e5e7eb"
          fillOpacity={0.7}
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
          letterSpacing={0.1}
          anchorY="middle"
        >
          BUAIP
        </Text>
      </group>

      <WaterReflection />

      {/* Hero Logo with gentle floating */}
      <group position={[0, 0, 0]}>
        <Float speed={2} rotationIntensity={0.05} floatIntensity={0.5}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[7, 7]} />
            <meshBasicMaterial map={logoTexture} transparent opacity={1} side={THREE.DoubleSide} />

            {/* Subdescription HTML positioned right below the logo (in 3D space) so it reflects slightly */}
            <Html center position={[0, -3.8, 0]} className="w-[600px] text-center pointer-events-none">
              <p className="text-zinc-600 font-medium leading-relaxed tracking-wide text-sm drop-shadow-sm">
                Bharat Universal AI Platform — One AI system connecting citizens to opportunities, services, and intelligence.
              </p>
            </Html>
          </mesh>
        </Float>

        {/* Circular Engine Orbit (Appears on scroll) */}
        {engines.map((engine, i) => {
          const radius = 6.5;
          const angle = (i / engines.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isHovered = hoveredNode === i;

          // Pop-in stagger offset calculation based on index
          const threshold = 0.1 + (i * 0.05);

          return (
            <Html
              key={i}
              position={[x, y, 0]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                className="transition-all duration-700 ease-out flex flex-col items-center gap-2 cursor-pointer group"
                style={{
                  opacity: scroll.offset > threshold ? 1 : 0,
                  transform: scroll.offset > threshold ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
                  pointerEvents: scroll.offset > threshold ? 'auto' : 'none'
                }}
                onMouseEnter={() => setHoveredNode(i)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => window.location.href = `/${engine.name.split(' ')[0].toLowerCase()}`}
              >
                <div className={`w-14 h-14 rounded-full bg-white shadow-lg border border-zinc-100 flex items-center justify-center text-2xl transition-transform duration-300 ${isHovered ? 'scale-110 shadow-xl' : ''}`}>
                  {engine.icon}
                </div>

                {isHovered && (
                  <div className="absolute top-16 bg-white p-3 rounded-xl shadow-xl border border-zinc-100 w-48 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="text-zinc-900 font-bold text-xs mb-1 uppercase tracking-wide">{engine.name}</h4>
                    <p className="text-zinc-500 text-[10px] leading-snug">{engine.desc}</p>
                  </div>
                )}
              </div>
            </Html>
          );
        })}
      </group>
    </>
  );
}

export default function BuaipScene() {
  return (
    <div className="w-full h-[100dvh] bg-[#fdfaf6] overflow-hidden fixed inset-0 font-sans">
      {/* Top Navigation from Request */}
      <nav className="absolute top-0 w-full z-50 p-8 flex justify-center items-center pointer-events-auto">
        <div className="flex gap-16 text-[13px] font-medium tracking-wide text-zinc-600">
          <a href="#" className="hover:text-black transition-colors">Home</a>
          <a href="#" className="hover:text-black transition-colors">AI Engines</a>
          <a href="#" className="hover:text-black transition-colors">About</a>
          <a href="#" className="hover:text-black transition-colors">Languages</a>
        </div>
      </nav>

      {/* Linear Gradient to smooth out the horizon */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#fdfaf6] to-transparent pointer-events-none z-10"></div>

      <Canvas camera={{ position: [0, 0, 11], fov: 45 }}>
        <ScrollControls pages={3} damping={0.1}>
          <SceneManager />
        </ScrollControls>
        <Environment preset="studio" />
      </Canvas>

      {/* Dynamic Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 text-zinc-400 flex flex-col items-center pointer-events-none">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3">Scroll to Explore</span>
        <div className="w-px h-12 bg-gradient-to-b from-zinc-300 to-transparent"></div>
      </div>
    </div>
  );
}
