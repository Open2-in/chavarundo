"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: (completedOrSkipped: boolean) => void;
}

export default function OnboardingGuide({ isOpen, onClose }: OnboardingGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: "Welcome to Chavarundo",
      subtitle: " Kerala's Public Waste Tracker",
      description: "Chavarundo (ചവറുണ്ടോ — \"Is there waste?\") is a community-driven map to report, track, and clear public garbage dumps in Kerala. Together, let's clean our neighborhoods and hold authorities accountable.",
      illustration: (
        <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="keralaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#ff9900" />
              <stop offset="100%" stopColor="#ff003c" />
            </linearGradient>
          </defs>
          
          {/* Abstract Grid Map */}
          <g opacity="0.3">
            <path d="M 20 90 L 380 90" stroke="#00f0ff" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M 200 10 L 200 170" stroke="#00f0ff" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="200" cy="90" r="70" stroke="#00f0ff" strokeWidth="1" strokeDasharray="2 4" />
            <circle cx="200" cy="90" r="40" stroke="#00f0ff" strokeWidth="0.5" />
          </g>

          {/* Abstract Kerala Silhouette Line */}
          <path 
            d="M 170 30 Q 185 50 180 70 T 205 110 T 220 150" 
            stroke="url(#neonGrad)" 
            strokeWidth="4" 
            strokeLinecap="round" 
            className="animate-pulse"
          />

          {/* Map Pins */}
          <g>
            {/* Pin 1 (High severity - Red) */}
            <circle cx="180" cy="60" r="10" fill="#ff003c" fillOpacity="0.2" />
            <circle cx="180" cy="60" r="4" fill="#ff003c" />
            <line x1="180" y1="60" x2="180" y2="70" stroke="#ff003c" strokeWidth="1.5" />
            
            {/* Pin 2 (Medium severity - Orange) */}
            <circle cx="200" cy="100" r="10" fill="#ff9900" fillOpacity="0.2" />
            <circle cx="200" cy="100" r="4" fill="#ff9900" />
            <line x1="200" y1="100" x2="200" y2="110" stroke="#ff9900" strokeWidth="1.5" />

            {/* Pin 3 (Low severity - Cyan) */}
            <circle cx="215" cy="130" r="10" fill="#00f0ff" fillOpacity="0.2" />
            <circle cx="215" cy="130" r="4" fill="#00f0ff" />
            <line x1="215" y1="130" x2="215" y2="140" stroke="#00f0ff" strokeWidth="1.5" />
          </g>

          {/* Glowing Ripple around central pin */}
          <circle cx="200" cy="100" r="22" stroke="#ff9900" strokeWidth="1" opacity="0.8" className="scale-anim">
            <animate attributeName="r" values="8;25;8" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>
      )
    },
    {
      title: "Step 1: Snap a Photo",
      subtitle: "Capture the garbage spot",
      description: "Tap the Report (+) button to take a photo of the waste. Just make sure your phone's location (GPS) is turned on so the app can automatically find where the photo was taken.",
      illustration: (
        <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="blueCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#0072ff" />
            </linearGradient>
          </defs>

          {/* Smartphone mockup */}
          <rect x="150" y="15" width="100" height="150" rx="16" fill="#121212" stroke="#333" strokeWidth="3" />
          <rect x="155" y="25" width="90" height="130" rx="10" fill="#000" />
          
          {/* Inner camera screen */}
          <rect x="158" y="28" width="84" height="100" rx="6" fill="#1c1c1e" />
          
          {/* Mock photo elements */}
          <path d="M 165 110 L 180 95 L 205 115 L 220 105 L 235 118" stroke="#444" strokeWidth="2" strokeLinecap="round" />
          
          {/* Simulated garbage pile in screen */}
          <path d="M 175 115 Q 185 85 200 95 T 225 115" fill="#333" />
          <circle cx="185" cy="105" r="3" fill="#ff9900" opacity="0.7" />
          <circle cx="210" cy="108" r="4" fill="#ff003c" opacity="0.6" />

          {/* Viewfinder crosshairs */}
          <path d="M 190 78 L 195 78 A 5 5 0 0 0 200 73 L 200 68" stroke="#00f0ff" strokeWidth="1.5" fill="none" />
          <path d="M 210 78 L 205 78 A 5 5 0 0 1 200 73 L 200 68" stroke="#00f0ff" strokeWidth="1.5" fill="none" />
          <path d="M 190 62 L 195 62 A 5 5 0 0 1 200 67 L 200 72" stroke="#00f0ff" strokeWidth="1.5" fill="none" />
          <path d="M 210 62 L 205 62 A 5 5 0 0 0 200 67 L 200 72" stroke="#00f0ff" strokeWidth="1.5" fill="none" />
          
          {/* Camera lens top */}
          <circle cx="200" cy="20" r="3" fill="#333" />

          {/* Geotag GPS overlay */}
          <rect x="110" y="115" width="80" height="32" rx="6" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" strokeWidth="1" className="backdrop-blur-sm" />
          <text x="116" y="127" fill="#00f0ff" fontSize="7" fontFamily="monospace" fontWeight="bold">GPS ACTIVE</text>
          <text x="116" y="138" fill="#fff" fontSize="6.5" fontFamily="monospace">9.9312°N 76.26°E</text>

          {/* Flash animation */}
          <circle cx="200" cy="70" r="1" fill="#fff" opacity="0">
            <animate attributeName="r" values="1;45;1" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.8;0" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      )
    },
    {
      title: "Step 2: Check the Map",
      subtitle: "Pinpoint the exact location",
      description: "Double-check the marker on the map. You can drag the pin slightly to get it exactly on the right spot. For accuracy, the pin must stay close to where the photo was captured.",
      illustration: (
        <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Map Grid */}
          <path d="M 50 20 L 350 20 M 50 60 L 350 60 M 50 100 L 350 100 M 50 140 L 350 140" stroke="#222" strokeWidth="1" />
          <path d="M 90 10 L 90 170 M 170 10 L 170 170 M 250 10 L 250 170 M 330 10 L 330 170" stroke="#222" strokeWidth="1" />

          {/* Streets */}
          <path d="M 90 60 L 170 100 L 330 100" stroke="#333" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 170 10 L 170 170" stroke="#333" strokeWidth="12" strokeLinecap="round" />
          <path d="M 90 60 L 170 100 L 330 100" stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />

          {/* 30m constraint circle */}
          <circle cx="170" cy="100" r="45" fill="rgba(0, 240, 255, 0.06)" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="175" y="68" fill="#00f0ff" fontSize="8" fontFamily="monospace" opacity="0.8">30m Limit</text>

          {/* Anchor Center Pin */}
          <circle cx="170" cy="100" r="3" fill="#fff" />
          
          {/* Animated Drag Pin */}
          <g>
            <animateTransform 
              attributeName="transform" 
              type="translate" 
              values="0,0; -25,-15; 0,0" 
              dur="4s" 
              repeatCount="indefinite" 
            />
            {/* Red marker pin */}
            <path d="M 170 100 C 160 85 160 75 170 70 C 180 75 180 85 170 100 Z" fill="#ff003c" />
            <circle cx="170" cy="80" r="3.5" fill="#fff" />
            
            {/* Pulse Indicator */}
            <circle cx="170" cy="100" r="8" stroke="#ff003c" strokeWidth="1.5" opacity="0.5">
              <animate attributeName="r" values="3;10;3" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Hand Drag Cursor */}
            <g transform="translate(175, 95)" opacity="0.9">
              <path d="M0 0 L10 10 L6 11 L10 18 L7 19 L3 12 L0 15 Z" fill="#fff" stroke="#000" strokeWidth="1.5" />
            </g>
          </g>
        </svg>
      )
    },
    {
      title: "Step 3: AI Audit & Cleanup",
      subtitle: "We find the right authority",
      description: "Our system automatically checks the photo, confirms it is near a public road, and alerts the correct local authority (Ward Member, Panchayat, PWD, or NHAI) so they can take action.",
      illustration: (
        <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* AI Circle / Scanner Core */}
          <circle cx="110" cy="90" r="35" fill="rgba(0, 240, 255, 0.08)" stroke="#00f0ff" strokeWidth="1.5" />
          <circle cx="110" cy="90" r="25" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="3 3" />
          
          {/* Pulsing scan line */}
          <line x1="80" y1="90" x2="140" y2="90" stroke="#00f0ff" strokeWidth="2" opacity="0.8">
            <animate attributeName="y1" values="60;120;60" dur="3s" repeatCount="indefinite" />
            <animate attributeName="y2" values="60;120;60" dur="3s" repeatCount="indefinite" />
          </line>
          <text x="92" y="94" fill="#00f0ff" fontSize="10" fontFamily="monospace" fontWeight="bold" className="animate-pulse">AI</text>

          {/* Connection Lines (Tree) */}
          <path d="M 145 90 L 200 90" stroke="#00f0ff" strokeWidth="1.5" />
          <path d="M 200 45 L 200 135" stroke="#00f0ff" strokeWidth="1.5" />
          <path d="M 200 45 L 230 45" stroke="#ff003c" strokeWidth="1.5" />
          <path d="M 200 75 L 230 75" stroke="#ff9900" strokeWidth="1.5" />
          <path d="M 200 105 L 230 105" stroke="#22c55e" strokeWidth="1.5" />
          <path d="M 200 135 L 230 135" stroke="#00f0ff" strokeWidth="1.5" />

          {/* Authority Nodes */}
          {/* Node 1: NHAI (Red) */}
          <rect x="230" y="35" width="80" height="20" rx="4" fill="#121212" stroke="#ff003c" strokeWidth="1" />
          <text x="240" y="48" fill="#ff003c" fontSize="8" fontFamily="monospace" fontWeight="bold">NHAI / MP</text>

          {/* Node 2: State PWD (Orange) */}
          <rect x="230" y="65" width="80" height="20" rx="4" fill="#121212" stroke="#ff9900" strokeWidth="1" />
          <text x="240" y="78" fill="#ff9900" fontSize="8" fontFamily="monospace" fontWeight="bold">PWD / MLA</text>

          {/* Node 3: Panchayat/LSGD (Green) */}
          <rect x="230" y="95" width="80" height="20" rx="4" fill="#121212" stroke="#22c55e" strokeWidth="1" />
          <text x="240" y="108" fill="#22c55e" fontSize="7.5" fontFamily="monospace" fontWeight="bold">LSGD / PANCH</text>

          {/* Node 4: Ward Member (Cyan) */}
          <rect x="230" y="125" width="80" height="20" rx="4" fill="#121212" stroke="#00f0ff" strokeWidth="1" />
          <text x="240" y="138" fill="#00f0ff" fontSize="8" fontFamily="monospace" fontWeight="bold">WARD MEMBER</text>
        </svg>
      )
    },
    {
      title: "Join the Mission",
      subtitle: "Share and contribute",
      description: "You can make a difference! Share reports with neighbors to raise awareness, or upvote other findings near you to help local authorities notice them faster.",
      illustration: (
        <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          
          {/* Central sharing node */}
          <circle cx="200" cy="90" r="28" fill="rgba(168, 85, 247, 0.08)" stroke="#a855f7" strokeWidth="1.5" />
          <path d="M 190 95 L 200 85 L 210 95" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 200 85 L 200 105" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Dotted connection lines to other citizen nodes */}
          <line x1="200" y1="90" x2="110" y2="50" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="200" y1="90" x2="290" y2="50" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="200" y1="90" x2="130" y2="135" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="200" y1="90" x2="270" y2="135" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Citizen Node 1 (Top Left) */}
          <circle cx="110" cy="50" r="16" fill="#121212" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="110" cy="46" r="4" fill="#6366f1" />
          <path d="M 102 58 C 102 54 105 52 110 52 C 115 52 118 54 118 58 Z" fill="#6366f1" />

          {/* Citizen Node 2 (Top Right) */}
          <circle cx="290" cy="50" r="16" fill="#121212" stroke="#22c55e" strokeWidth="1.5" />
          <circle cx="290" cy="46" r="4" fill="#22c55e" />
          <path d="M 282 58 C 282 54 285 52 290 52 C 295 52 298 54 298 58 Z" fill="#22c55e" />

          {/* Citizen Node 3 (Bottom Left) */}
          <circle cx="130" cy="135" r="16" fill="#121212" stroke="#ff9900" strokeWidth="1.5" />
          <circle cx="130" cy="131" r="4" fill="#ff9900" />
          <path d="M 122 143 C 122 139 125 137 130 137 C 135 137 138 139 138 143 Z" fill="#ff9900" />

          {/* Citizen Node 4 (Bottom Right) */}
          <circle cx="270" cy="135" r="16" fill="#121212" stroke="#00f0ff" strokeWidth="1.5" />
          <circle cx="270" cy="131" r="4" fill="#00f0ff" />
          <path d="M 262 143 C 262 139 265 137 270 137 C 275 137 278 139 278 143 Z" fill="#00f0ff" />
          
          {/* Animated hearts / upvotes rising */}
          <g opacity="0.8">
            <path d="M 155 75 Q 155 70 160 70 Q 165 70 165 75 T 155 85 T 145 75 Z" fill="#ff003c" transform="scale(0.8) translate(40, 20)">
              <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="140,75; 135,55" dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M 245 75 Q 245 70 250 70 Q 255 70 255 75 T 245 85 T 235 75 Z" fill="#ff003c" transform="scale(0.8) translate(40, 20)">
              <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="240,75; 245,50" dur="2.5s" repeatCount="indefinite" />
            </path>
          </g>
        </svg>
      )
    },
    {
      title: "Restore Our Pride",
      subtitle: "Let's clean Kerala!",
      description: "Let's work together to clear public garbage and make our beautiful home clean again. Join us in restoring Kerala to its true title: God's Own Country!",
      illustration: (
        <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff9900" stopOpacity="0.2" />
              <stop offset="60%" stopColor="#00f0ff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffb800" />
              <stop offset="100%" stopColor="#ff5c00" />
            </linearGradient>
          </defs>

          {/* Background clean sky */}
          <rect x="50" y="15" width="300" height="150" rx="20" fill="url(#skyGrad)" opacity="0.5" />

          {/* Rising Sun */}
          <circle cx="200" cy="95" r="24" fill="url(#sunGrad)" />
          <circle cx="200" cy="95" r="32" stroke="#ffb800" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.5" />

          {/* Clean hills / backwaters silhouette */}
          <path d="M 50 145 Q 120 120 200 135 T 350 120 L 350 165 L 50 165 Z" fill="#1b4332" opacity="0.9" />
          <path d="M 50 155 Q 150 145 230 152 T 350 148 L 350 165 L 50 165 Z" fill="#2d6a4f" />

          {/* Coconut Palms (Right side) */}
          <g transform="translate(290, 80)">
            {/* Trunk */}
            <path d="M 15 85 Q 12 45 3 5" stroke="#fff" strokeWidth="2.5" fill="none" />
            {/* Leaves */}
            <path d="M 3 5 Q -15 0 -25 15 M 3 5 Q -10 -15 3 -25 M 3 5 Q 20 -10 32 5 M 3 5 Q 15 15 20 30 M 3 5 Q -5 20 -12 35" stroke="#22c55e" strokeWidth="1.5" fill="none" />
          </g>

          {/* Coconut Palms (Left side) */}
          <g transform="translate(90, 85)">
            {/* Trunk */}
            <path d="M -5 80 Q -1 40 5 5" stroke="#fff" strokeWidth="2" fill="none" />
            {/* Leaves */}
            <path d="M 5 5 Q 20 0 28 12 M 5 5 Q 15 -12 5 -22 M 5 5 Q -10 -8 -20 5 M 5 5 Q -8 12 -12 25" stroke="#22c55e" strokeWidth="1.2" fill="none" />
          </g>

          {/* Sparkles / clean air elements */}
          <g>
            {/* Sparkle 1 */}
            <path d="M 150 50 L 152 55 L 157 57 L 152 59 L 150 64 L 148 59 L 143 57 L 148 55 Z" fill="#fff" opacity="0.8">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
            </path>
            {/* Sparkle 2 */}
            <path d="M 240 40 L 241 43 L 244 44 L 241 45 L 240 48 L 239 45 L 236 44 L 239 43 Z" fill="#fff" opacity="0.8">
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
            </path>
          </g>

          {/* Motivational text banner "GOD'S OWN COUNTRY" */}
          <rect x="130" y="115" width="140" height="18" rx="9" fill="rgba(0, 0, 0, 0.6)" stroke="#00f0ff" strokeWidth="0.8" className="backdrop-blur-sm" />
          <text x="200" y="127" fill="#00f0ff" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="1.5">GOD'S OWN COUNTRY</text>
        </svg>
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Completed last slide -> close & persist
      onClose(true);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onClose(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3000] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
          onClick={() => onClose(false)} // Doesn't persist if they click backdrop (per request)
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative z-[3001] w-[min(480px,94vw)] bg-white/95 dark:bg-neutral-950/95 border border-cyan-500/30 rounded-3xl font-mono shadow-[0_0_50px_rgba(0,255,255,0.2)] overflow-hidden flex flex-col p-6 text-neutral-900 dark:text-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/80">
                Chavarundo Guide
              </span>
            </div>
            
            {/* Step indicator */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                Step <strong className="text-cyan-500 dark:text-cyan-400">{currentSlide + 1}</strong> of {slides.length}
              </span>
              <button 
                onClick={() => onClose(false)} // Doesn't persist
                className="text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
                title="Close guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Carousel Slide Area with slide animation */}
          <div className="relative min-h-[300px] flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -25 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center text-center"
              >
                {/* Illustration Frame */}
                <div className="w-full h-44 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-cyan-500/10 rounded-2xl overflow-hidden mb-5 flex items-center justify-center p-2">
                  {slides[currentSlide].illustration}
                </div>

                {/* Text Content */}
                <div className="flex flex-col gap-1 px-1">
                  <h3 className="text-base font-bold tracking-wider text-neutral-800 dark:text-neutral-100 uppercase">
                    {slides[currentSlide].title}
                  </h3>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-semibold mb-2">
                    {slides[currentSlide].subtitle}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
                    {slides[currentSlide].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-between border-t border-cyan-500/10 pt-4 mt-6">
            
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === i 
                      ? "w-6 bg-cyan-500 dark:bg-cyan-400" 
                      : "w-2 bg-neutral-300 dark:bg-neutral-800 hover:bg-neutral-400"
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {currentSlide < slides.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="text-[10px] text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 uppercase tracking-widest font-bold px-2 py-1.5 transition-colors"
                >
                  Skip Tour
                </button>
              )}

              <div className="flex gap-2">
                {currentSlide > 0 && (
                  <button
                    onClick={handleBack}
                    className="p-2 border border-neutral-300 dark:border-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-600 dark:text-neutral-400"
                    aria-label="Previous step"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className={`flex items-center gap-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
                    currentSlide === slides.length - 1
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                      : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  {currentSlide === slides.length - 1 ? (
                    <span>Let&apos;s Go</span>
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
