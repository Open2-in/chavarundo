"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { Modal, Button } from "./base";
import { useSVG } from "@/store/svgStore";
import slidesData from "../data/onboarding-slides.json";

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: (completedOrSkipped: boolean) => void;
}

interface Slide {
  title: string;
  subtitle: string;
  description: string;
  illustrationUrl: string;
}

const slides = slidesData as Slide[];

export default function OnboardingGuide({ isOpen, onClose }: OnboardingGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const svgContent = useSVG(slides[currentSlide]?.illustrationUrl);

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
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(false)}
      backdropClose={true}
      showCloseButton={true}
      size="md"
      zIndex={3000}
      title={
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/80">
            Chavarundo Guide
          </span>
        </div>
      }
      headerRight={
        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
          Step <strong className="text-cyan-500 dark:text-cyan-400">{currentSlide + 1}</strong> of {slides.length}
        </span>
      }
      footer={
        <div className="flex items-center justify-between font-mono">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === i 
                    ? "w-6 bg-cyan-500 dark:bg-cyan-400" 
                    : "w-2 bg-neutral-500 dark:bg-neutral-700 hover:bg-neutral-600"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {currentSlide < slides.length - 1 && (
              <Button
                variant="cancel"
                onClick={handleSkip}
              >
                Skip Tour
              </Button>
            )}

            <div className="flex gap-2">
              {currentSlide > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  aria-label="Previous step"
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                variant={currentSlide === slides.length - 1 ? "cyan" : "outline"}
                size="sm"
                onClick={handleNext}
              >
                {currentSlide === slides.length - 1 ? (
                  <span>Let&apos;s Go</span>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="relative min-h-[300px] w-full flex flex-col items-center overflow-hidden">
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
            <div className="w-full h-44 bg-slate-50 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-cyan-500/10 rounded-2xl overflow-hidden mb-5 flex items-center justify-center p-2">
              {svgContent ? (
                <div 
                  className="w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : (
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Text Content */}
            <div className="flex flex-col gap-1 px-1 font-mono">
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
    </Modal>
  );
}
