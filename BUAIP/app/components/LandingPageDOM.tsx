"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const engines = [
    { name: "Scheme Finder (Conversational AI)", desc: "Chat with AI to find government schemes you qualify for.", icon: "🤖", route: "/scheme-conversation" },
    { name: "Scheme Eligibility Engine", desc: "Find government schemes and eligibility.", icon: "🏛️", route: "/citizen-dashboard" },
    { name: "ANNADATA", desc: "Farmer AI with crop prices and weather alerts.", icon: "🌾", route: "/app/annadata" },
    { name: "NYAYA", desc: "Legal rights assistant for complaints and RTI.", icon: "⚖️", route: "/nyaya" },
    { name: "UDYOG", desc: "Micro-business mentor for loans and registration.", icon: "🏪", route: "/udyog" },
    { name: "GLOBALSELLER AI", desc: "AI assistant for global e-commerce selling.", icon: "🌍", route: "/globalseller" },
    { name: "ATITHI AI", desc: "AI travel and cultural guide for India.", icon: "🧳", route: "/atithi" }
];

export default function LandingPageDOM() {
    const router = useRouter();
    const [hoveredNode, setHoveredNode] = useState<number | null>(null);

    return (
        <div className="min-h-screen w-full bg-[#f5f1ed] scroll-smooth">
            
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-center">
                    <div className="flex gap-12 text-sm font-medium text-gray-700">
                        <a href="#hero" className="hover:text-black transition-colors">Home</a>
                        <a href="#ai-engines" className="hover:text-black transition-colors">AI Engines</a>
                        <a href="#about" className="hover:text-black transition-colors">About</a>
                        <a href="#languages" className="hover:text-black transition-colors">Languages</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div id="hero" className="w-full min-h-screen pt-20 flex flex-col items-center justify-center px-4">
                
                {/* Center Logo and Text */}
                <div className="flex flex-col items-center">
                    {/* Logo with float animation */}
                    <motion.div
                        animate={{ y: [-8, 8, -8] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="mb-8"
                    >
                        <div className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 flex items-center justify-center">
                            <img
                                src="/logo.png"
                                alt="BUAIP India Map Logo"
                                className="w-full h-full object-contain"
                                style={{ 
                                    filter: "drop-shadow(0px 20px 40px rgba(0,0,0,0.12))"
                                }}
                            />
                        </div>
                    </motion.div>

                    {/* BUAIP Heading */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-center text-gray-900 mb-4 tracking-tight">
                        BUAIP
                    </h1>

                    {/* Description */}
                    <p className="text-center text-gray-600 max-w-2xl text-sm md:text-base leading-relaxed mb-12">
                        Bharat's unified AI platform connecting citizens to opportunities, services, and intelligent guidance across education, agriculture, healthcare, jobs, law, and entrepreneurship.
                    </p>
                </div>

                {/* Scroll Indicator */}
                <div className="mt-16 flex flex-col items-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Scroll to Explore</span>
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-0.5 h-8 bg-gradient-to-b from-gray-400 to-transparent"
                    />
                </div>
            </div>

            {/* Engines Grid Section */}
            <div id="ai-engines" className="w-full bg-white py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4">AI Engines</h2>
                    <p className="text-center text-gray-600 mb-12">Choose an engine to explore</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {engines.map((engine, i) => (
                            <motion.div
                                key={i}
                                className={`rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group ${
                                    i === 0
                                        ? 'lg:col-span-2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-2 border-purple-700'
                                        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-gray-200 text-gray-900'
                                }`}
                                whileHover={{ y: -4 }}
                                onMouseEnter={() => setHoveredNode(i)}
                                onMouseLeave={() => setHoveredNode(null)}
                                onClick={() => router.push(engine.route)}
                            >
                                <div className={`text-4xl mb-4 ${i === 0 ? 'text-5xl' : ''}`}>{engine.icon}</div>
                                <h3 className={`font-bold mb-2 ${i === 0 ? 'text-2xl' : 'text-gray-900'}`}>{engine.name}</h3>
                                <p className={`text-sm ${i === 0 ? 'text-purple-100' : 'text-gray-600'}`}>{engine.desc}</p>
                                {i === 0 && (
                                    <div className="mt-4 text-xs font-semibold text-purple-200 uppercase tracking-wide">
                                        ✨ New: Conversational AI Interface ✨
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div id="about" className="w-full bg-gradient-to-br from-slate-50 to-blue-50 py-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-6">About BUAIP</h2>
                    
                    <div className="space-y-6 text-gray-700 leading-relaxed">
                        <p className="text-lg">
                            <strong>Bharat Unified Access Intelligence Platform (BUAIP)</strong> is a multi-engine AI ecosystem designed to simplify access to opportunities, services, and knowledge for every citizen of India.
                        </p>
                        
                        <p>
                            Across India, information about education, government schemes, healthcare, employment, legal rights, and entrepreneurship exists in fragmented systems. Citizens often struggle to find the right information at the right time.
                        </p>
                        
                        <p>
                            BUAIP solves this challenge by bringing multiple specialized AI engines together into a single intelligent platform.
                        </p>
                        
                        <p>
                            Instead of searching across dozens of websites, citizens interact with one unified system that provides guidance, recommendations, and access to services across multiple domains.
                        </p>
                        
                        <p>
                            The platform is built around 11 specialized AI engines, each designed to solve a specific real-world problem.
                        </p>
                        
                        <p className="text-lg font-semibold text-gray-900">
                            Together they create a connected ecosystem that empowers citizens, farmers, students, entrepreneurs, senior citizens, and travelers.
                        </p>
                    </div>

                    {/* The 6 Core AI Engines */}
                    <div className="mt-16">
                        <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">The 6 Core Engines</h3>
                        
                        <div className="space-y-8">
                            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-indigo-600">
                                <h4 className="text-xl font-bold text-indigo-600 mb-2">Scheme Eligibility</h4>
                                <p className="text-gray-700">Helps citizens discover and apply for government welfare schemes by automatically identifying eligibility and guiding users through the application process.</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-amber-600">
                                <h4 className="text-xl font-bold text-amber-600 mb-2">ANNADATA — Agriculture Intelligence</h4>
                                <p className="text-gray-700">Supports farmers with real-time insights including crop prices, weather alerts, market demand, and government agricultural schemes.</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-purple-600">
                                <h4 className="text-xl font-bold text-purple-600 mb-2">NYAYA — Legal Assistant</h4>
                                <p className="text-gray-700">Simplifies legal awareness by helping citizens understand their rights, file complaints, generate RTI applications, and access legal resources.</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-600">
                                <h4 className="text-xl font-bold text-green-600 mb-2">UDYOG — Entrepreneurship Engine</h4>
                                <p className="text-gray-700">Guides small businesses and entrepreneurs through registrations, financial schemes, loans, and digital payment systems.</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-orange-600">
                                <h4 className="text-xl font-bold text-orange-600 mb-2">GlobalSeller — Export AI</h4>
                                <p className="text-gray-700">Helps Indian entrepreneurs expand globally through e-commerce by guiding them on international selling, logistics, and compliance.</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-cyan-600">
                                <h4 className="text-xl font-bold text-cyan-600 mb-2">ATITHI — Travel AI</h4>
                                <p className="text-gray-700">An AI guide designed for travelers and visitors to India, providing assistance with culture, transportation, safety, and local services.</p>
                            </div>
                        </div>
                    </div>

                    {/* Mission & Vision */}
                    <div className="mt-16 grid md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl p-8 shadow-sm">
                            <h3 className="text-2xl font-bold text-indigo-600 mb-4">Mission</h3>
                            <p className="text-gray-700">BUAIP's mission is to democratize access to intelligence and opportunity, ensuring that every citizen can navigate complex systems with clarity and confidence.</p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-sm">
                            <h3 className="text-2xl font-bold text-indigo-600 mb-4">Vision</h3>
                            <p className="text-gray-700">To build a unified AI infrastructure that empowers individuals, strengthens communities, and accelerates India's digital transformation.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Languages Section Placeholder */}
            <div id="languages" className="w-full bg-white py-20 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Multi-Language Support</h2>
                    <p className="text-gray-600">BUAIP supports multiple Indian languages to ensure accessibility for all citizens.</p>
                </div>
            </div>
        </div>
    );
}
