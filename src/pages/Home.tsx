import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import Hero from '../components/Hero';
import Houses from '../components/Houses';
import AboutUs from '../components/AboutUs';
import Location from '../components/Location';
import ReservationCTA from '../components/ReservationCTA';
import Footer from '../components/Footer';

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [homeKey, setHomeKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Force immediate scroll position reset to absolute top on mount
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });

    const toggleVisibility = () => {
      if (window.scrollY > 600) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const handleScrollToTop = () => {
    // 1. Immediately trigger the clean dark transition overlay
    setIsTransitioning(true);
    
    // 2. While the screen is completely covered and dark, instantly scroll to the top and reset the key
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      setHomeKey(prev => prev + 1);
      
      // 3. Keep the dark overlay active for a split second, then fade it out
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 300); // 300ms is the optimal delay for the dark overlay to fade in completely
  };

  return (
    <main className="min-h-screen bg-black relative">
      {/* High-speed Elegant Cinematic Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="transit-shutter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] bg-[#0a0604] pointer-events-all"
          />
        )}
      </AnimatePresence>

      {/* Render the full content using the homeKey state to trigger full animation resets */}
      <div key={homeKey}>
        <Hero />
        <Houses />
        <AboutUs />
        <ReservationCTA />
        <Location />
        <Footer />
      </div>

      {/* Elegant Floating Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={handleScrollToTop}
            className="fixed bottom-8 right-8 z-[150] w-12 h-12 rounded-full border border-[#d4b098]/30 hover:border-[#d4b098] bg-[#0a0604]/80 backdrop-blur-md text-[#d4b098] hover:text-white flex items-center justify-center transition-all group cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(212,176,152,0.15)]"
            title="Voltar ao Topo & Reiniciar Animações"
          >
            <ArrowUp size={18} className="group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
