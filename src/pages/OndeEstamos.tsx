import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Sparkles, MapPin, Compass, BookOpen, Scroll, Calendar, Map, Navigation, ArrowUpRight, Globe, Info } from 'lucide-react';
import Footer from '../components/Footer';

export default function OndeEstamos() {
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for realistic interactive candle-light/shadow effect on the book
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    // Force scroll to top on mount
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = 'auto';
    
    const t = setTimeout(() => {
      setLoading(false);
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = 'smooth';
    }, 1500);

    return () => {
      clearTimeout(t);
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!bookRef.current) return;
    const rect = bookRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // SCREEN 1: Hero Welcome fades out between progress 0 and 0.12
  const heroOpacity = useTransform(scrollYProgress, [0, 0.10], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.10], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.10], [0, -30]);
  const heroDisplay = useTransform(scrollYProgress, (v) => v > 0.12 ? "none" : "flex");

  // SCREEN 2: BOOK BASE CONTAINER fades in after 0.08 and stays visible until 0.70
  const bookOpacity = useTransform(scrollYProgress, [0.08, 0.14, 0.68, 0.72], [0, 1, 1, 0]);
  const bookScale = useTransform(scrollYProgress, [0.08, 0.14, 0.68, 0.72], [0.97, 1, 1, 0.95]);
  const bookDisplay = useTransform(scrollYProgress, (v) => (v < 0.06 || v > 0.73) ? "none" : "flex");

  // SCREEN 3: GEOGRAPHICAL LOCATION CONTAINER fades in after 0.70 and stays visible until 0.95
  const locOpacity = useTransform(scrollYProgress, [0.70, 0.75, 0.94, 0.98], [0, 1, 1, 0]);
  const locScale = useTransform(scrollYProgress, [0.70, 0.75, 0.94, 0.98], [0.97, 1, 1, 0.96]);
  const locY = useTransform(scrollYProgress, [0.70, 0.75, 0.94, 0.98], [25, 0, 0, -20]);
  const locDisplay = useTransform(scrollYProgress, (v) => (v < 0.69 || v > 0.99) ? "none" : "flex");

  const [currentChapter, setCurrentChapter] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.26) {
        setCurrentChapter(0);
      } else if (latest < 0.40) {
        setCurrentChapter(1);
      } else if (latest < 0.54) {
        setCurrentChapter(2);
      } else {
        setCurrentChapter(3);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // ULTRA CLEAN PAGE TRANSITIONS (Fades + subtle, premium vertical lifts)
  // Chapter 1: Prefácio (Scroll 0.11 -> 0.26)
  const ch1Opacity = useTransform(scrollYProgress, [0.11, 0.15, 0.23, 0.26], [0, 1, 1, 0]);
  const ch1Y = useTransform(scrollYProgress, [0.11, 0.15, 0.23, 0.26], [8, 0, 0, -8]);
  const ch1PointerEvents = useTransform(scrollYProgress, (v) => (v >= 0.11 && v < 0.25) ? "auto" : "none");

  // Chapter 2: A Capela (Scroll 0.25 -> 0.40)
  const ch2Opacity = useTransform(scrollYProgress, [0.25, 0.29, 0.37, 0.40], [0, 1, 1, 0]);
  const ch2Y = useTransform(scrollYProgress, [0.25, 0.29, 0.37, 0.40], [8, 0, 0, -8]);
  const ch2PointerEvents = useTransform(scrollYProgress, (v) => (v >= 0.25 && v < 0.39) ? "auto" : "none");

  // Chapter 3: A Romaria (Scroll 0.39 -> 0.54)
  const ch3Opacity = useTransform(scrollYProgress, [0.39, 0.43, 0.51, 0.54], [0, 1, 1, 0]);
  const ch3Y = useTransform(scrollYProgress, [0.39, 0.43, 0.51, 0.54], [8, 0, 0, -8]);
  const ch3PointerEvents = useTransform(scrollYProgress, (v) => (v >= 0.39 && v < 0.53) ? "auto" : "none");

  // Chapter 4: O Banquete (Scroll 0.53 -> 0.69)
  const ch4Opacity = useTransform(scrollYProgress, [0.53, 0.57, 0.65, 0.69], [0, 1, 1, 0]);
  const ch4Y = useTransform(scrollYProgress, [0.53, 0.57, 0.65, 0.69], [8, 0, 0, -8]);
  const ch4PointerEvents = useTransform(scrollYProgress, (v) => (v >= 0.53) ? "auto" : "none");

  // Navigation click trigger to smooth scroll to exact chapters
  const scrollToChapter = (chapterIdx: number) => {
    if (!containerRef.current) return;
    const totalHeight = containerRef.current.scrollHeight - window.innerHeight;
    let targetProgress = 0.20; // Chapter 1
    if (chapterIdx === 1) targetProgress = 0.34; // Chapter 2
    if (chapterIdx === 2) targetProgress = 0.48; // Chapter 3
    if (chapterIdx === 3) targetProgress = 0.62; // Chapter 4

    window.scrollTo({
      top: totalHeight * targetProgress,
      behavior: 'smooth'
    });
  };

  return (
    <div className="w-full bg-[#0a0604] text-[#2c1d11] selection:bg-[#d4b098] selection:text-[#0a0604]">
      {/* 1. Brand Loading Screen */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0604]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              <img 
                src="/src/assets/images/logo.png" 
                alt="Logo Ladoeiro" 
                className="w-48 md:w-64 invert brightness-0"
              />
              <div className="w-16 h-[1px] bg-stone-900 relative overflow-hidden">
                <motion.div 
                  className="absolute h-full bg-[#d4b098] w-1/2"
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll-Driven Animations Container */}
      <div 
        ref={containerRef}
        className={`relative w-full ${
          loading ? "h-screen overflow-hidden" : "h-[450vh]"
        }`}
      >

      {/* 2. Sticky Viewport Wrapper */}
      <div className="w-full h-screen sticky top-0 overflow-hidden">
        
        {/* Elegant Ambient Background Gradient & Video Overlay */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0a0604]">
          <div 
            className="absolute inset-0"
            style={{ 
              background: "radial-gradient(circle at 50% 50%, #20120a 0%, #0a0604 100%)"
            }}
          />
          
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-105 select-none pointer-events-none opacity-20"
            style={{ filter: 'brightness(0.35) contrast(1.1) saturate(0.95)' }}
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-fields-and-trees-42488-large.mp4" type="video/mp4" />
          </video>
          
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0604]/60 via-[#0a0604]/40 to-[#0a0604]" />
        </div>

        {/* MUCH STRONGER, GLORIOUS Glowing Halo behind the book that reacts to Mouse Tilt */}
        <motion.div 
          style={{
            x: useTransform(springX, [-300, 300], [-45, 45]),
            y: useTransform(springY, [-200, 200], [-35, 35]),
            opacity: useTransform(bookOpacity, [0, 1], [0, 0.45])
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] rounded-full bg-[#e69b5c] blur-[140px] pointer-events-none z-10 mix-blend-screen"
        />

        {/* HIGHLY VISIBLE Floating Cozy Golden Dust / Candle Sparks (Only when book is visible) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
          {[...Array(24)].map((_, i) => {
            const randomDelay = Math.random() * 4;
            const randomDuration = Math.random() * 8 + 6; // Sightly faster, livelier drift
            const randomSize = Math.random() * 3 + 2; // Bigger (2px to 5px)
            return (
              <motion.div
                key={i}
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${15 + Math.random() * 70}%`,
                  width: randomSize,
                  height: randomSize,
                  opacity: useTransform(bookOpacity, [0, 1], [0, Math.random() * 0.6 + 0.3]) // High visibility
                }}
                animate={{
                  y: [0, -120, 0],
                  x: [0, Math.random() * 60 - 30, 0],
                  opacity: [0.2, 0.85, 0.2],
                  scale: [0.9, 1.4, 0.9]
                }}
                transition={{
                  duration: randomDuration,
                  delay: randomDelay,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute rounded-full bg-gradient-to-br from-amber-300 to-[#d4b098] blur-[0.3px] shadow-[0_0_8px_#f59e0b]"
              />
            );
          })}
        </div>

        {/* Fixed Header Back Navigation */}
        <div className="absolute top-0 left-0 w-full z-40 px-6 md:px-12 py-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3 text-white/70 hover:text-white transition-colors group">
            <span className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/30 transition-all bg-black/40 backdrop-blur-md">
              <ArrowLeft size={16} className="text-[#d4b098]" />
            </span>
            <span className="font-sans uppercase text-[10px] tracking-widest hidden md:block font-medium">Voltar</span>
          </Link>
          
          <div className="flex items-center gap-2 text-[#d4b098]/80 text-xs font-sans uppercase tracking-widest">
            <BookOpen size={14} className="animate-pulse" />
            <span className="hidden sm:inline font-semibold">Crónicas de Santa Catarina</span>
          </div>
        </div>

        {/* SCREEN 1: Hero Welcome with Dedicated Mount Entrance Animation */}
        <motion.div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6"
          style={{ 
            opacity: heroOpacity, 
            scale: heroScale, 
            y: heroY, 
            display: heroDisplay
          }}
        >
          <AnimatePresence>
            {!loading && (
              <motion.div 
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
                className="flex flex-col items-center justify-center max-w-5xl"
              >
                <div className="flex items-center gap-2 text-[#d4b098] mb-6">
                  <Compass size={14} className="animate-spin-slow" />
                  <span className="font-sans uppercase text-[10px] tracking-[0.3em] font-medium animate-pulse">Ladoeiro, Beira Baixa</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-light text-white leading-tight drop-shadow-2xl">
                  Descubra as tradições<br/>e costumes do lar rural
                </h1>

                {/* Interactive Scroll Down Button */}
                <button 
                  onClick={() => {
                    if (containerRef.current) {
                      const scrollHeight = containerRef.current.scrollHeight - window.innerHeight;
                      window.scrollTo({
                        top: scrollHeight * 0.20,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="mt-16 flex flex-col items-center gap-3 opacity-90 cursor-pointer group focus:outline-none"
                >
                  <span className="text-[10px] uppercase tracking-[0.3em] font-sans text-stone-300 font-light group-hover:text-[#d4b098] transition-colors">Scroll para Abrir o Livro</span>
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md bg-black/40 shadow-lg group-hover:border-[#d4b098]/40 group-hover:bg-black/60 transition-all">
                    <ChevronDown size={16} className="text-[#d4b098]" />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* SCREEN 2: Smaller, Highly Animated Interactive Chronicles Book Frame */}
        <motion.div 
          className="absolute inset-0 z-30 flex items-center justify-center px-4 md:px-8 lg:px-16 py-16"
          style={{ 
            opacity: bookOpacity, 
            scale: bookScale,
            display: bookDisplay
          }}
        >
          {/* Smaller, intimate book aspect ratio with interactive Mouse Move tilts */}
          <motion.div 
            ref={bookRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX: useTransform(springY, [-200, 200], [4, -4]),
              rotateY: useTransform(springX, [-300, 300], [-5, 5]),
              transformStyle: "preserve-3d"
            }}
            className="relative w-full max-w-4xl aspect-[1.5/1] hidden md:flex rounded-2xl bg-[#20120a] p-[8px] border border-[#d4b098]/10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] transition-shadow duration-300 hover:shadow-[0_35px_80px_rgba(0,0,0,0.95)]"
          >
            
            {/* Elegant Corner Brackets with pulse/glow hover states */}
            <div className="absolute top-2.5 left-2.5 w-4.5 h-4.5 border-t border-l border-[#d4b098]/30 rounded-tl-sm group-hover:border-[#d4b098]/75 transition-colors" />
            <div className="absolute top-2.5 right-2.5 w-4.5 h-4.5 border-t border-r border-[#d4b098]/30 rounded-tr-sm group-hover:border-[#d4b098]/75 transition-colors" />
            <div className="absolute bottom-2.5 left-2.5 w-4.5 h-4.5 border-b border-l border-[#d4b098]/30 rounded-bl-sm group-hover:border-[#d4b098]/75 transition-colors" />
            <div className="absolute bottom-2.5 right-2.5 w-4.5 h-4.5 border-b border-r border-[#d4b098]/30 rounded-br-sm group-hover:border-[#d4b098]/75 transition-colors" />

            {/* Book Body (Outer Paper border) */}
            <div className="relative w-full h-full flex bg-[#fbf7f0] rounded-xl shadow-inner overflow-hidden border border-[#d4b098]/15">
              
              {/* Dynamic Candle Light Glare overlay following mouse coordinates */}
              <motion.div 
                style={{
                  background: useTransform(
                    [springX, springY],
                    ([x, y]) => `radial-gradient(circle 180px at ${400 + (x as number) * 0.8}px ${250 + (y as number) * 0.8}px, rgba(212, 176, 152, 0.08) 0%, transparent 100%)`
                  )
                }}
                className="absolute inset-0 z-20 pointer-events-none"
              />

              {/* Spine shadow crease (Creating the folded book depth) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[30px] -translate-x-1/2 z-35 pointer-events-none bg-gradient-to-r from-transparent via-[#20150b]/25 to-transparent" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 z-35 pointer-events-none bg-[#20150b]/35 shadow-sm" />
              
              {/* Slim Silk Ribbon Bookmark with dynamic subtle sway */}
              <motion.div 
                style={{
                  rotateZ: useTransform(springX, [-300, 300], [-1.5, 1.5]),
                  transformOrigin: "top center"
                }}
                className="absolute left-[49.5%] top-0 h-[75%] w-2 bg-gradient-to-r from-[#b3865c] via-[#d4b098] to-[#b3865c] z-40 rounded-b shadow-md transition-transform" 
              />

              {/* ACTIVE BOOK PAGES (Scroll-driven content swapping) */}
              <div className="w-full h-full relative">

                {/* ===================== PAGE SPREAD 1: INTRO ===================== */}
                <motion.div 
                  className="absolute inset-0 w-full h-full flex"
                  style={{ opacity: ch1Opacity, y: ch1Y, pointerEvents: ch1PointerEvents }}
                >
                  {/* Left Page: Cover Visual */}
                  <div className="w-1/2 h-full p-10 pr-12 flex flex-col justify-between border-r border-stone-800/5 bg-[#f5efe5]/30">
                    <div className="flex items-center gap-2 text-[#7c5d43] uppercase text-[9px] tracking-widest font-sans font-semibold">
                      <Scroll size={12} className="animate-pulse" />
                      <span>Prefácio de Ouro</span>
                    </div>
                    <div className="my-auto space-y-3">
                      <span className="font-sans text-[10px] tracking-widest uppercase text-[#7c5d43]/80 font-bold block">Crónica I</span>
                      <h2 className="text-3xl lg:text-4xl font-serif text-[#3d2715] leading-tight font-medium">
                        O Ladoeiro & <br/><span className="italic font-light text-[#7c5d43]">As Suas Raízes</span>
                      </h2>
                      <div className="w-10 h-[1px] bg-[#d4b098] my-3" />
                      <p className="text-[#5c4a3c] text-xs lg:text-sm font-sans leading-relaxed italic">
                        "Onde a terra fértil da Beira Baixa abraça as memórias eternas das gentes que a cultivam com orgulho."
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#7c5d43] text-[9px] uppercase tracking-wider font-sans">
                      <MapPin size={10} className="text-[#d4b098]" />
                      <span>Terras de Idanha</span>
                    </div>
                  </div>

                  {/* Right Page: Preface Text */}
                  <div className="w-1/2 h-full p-10 pl-12 flex flex-col justify-between">
                    <div className="text-right text-[#7c5d43] uppercase text-[9px] tracking-widest font-sans font-bold">
                      Pág. 01
                    </div>
                    <div className="my-auto space-y-4">
                      <p className="text-[#3a2c20] text-sm lg:text-base leading-relaxed font-serif font-light first-letter:text-4xl first-letter:font-serif first-letter:float-left first-letter:mr-2.5 first-letter:font-bold first-letter:text-[#7c5d43]">
                        Luzindo no coração da Beira Baixa, o Ladoeiro estende-se por planícies férteis de beleza agreste e generosa. O seu microclima e a dedicação das suas gentes moldaram uma identidade única, esculpida através de séculos de labuta e forte convívio comunitário.
                      </p>
                      <p className="text-[#4e3d30] text-xs lg:text-sm leading-relaxed font-sans font-light">
                        Este livro convida-o a desfolhar as histórias, as memórias rurais e as tradições solenes que se mantêm vivas e puras em cada recanto do Ladoeiro. Scroll para descobrir.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <span className="font-serif italic text-[10px] text-[#7c5d43]/70">Capítulo Primeiro</span>
                    </div>
                  </div>
                </motion.div>

                {/* ===================== PAGE SPREAD 2: A CAPELA ===================== */}
                <motion.div 
                  className="absolute inset-0 w-full h-full flex"
                  style={{ opacity: ch2Opacity, y: ch2Y, pointerEvents: ch2PointerEvents }}
                >
                  {/* Left Page: Hand-painted Chapel Portrait FULL BLEED */}
                  <div className="w-1/2 h-full relative overflow-hidden border-r border-stone-800/5 group/image">
                    <img 
                      src="/src/assets/images/ladoeiro_chapel_painted_1785366432000.jpg" 
                      alt="Capela de Santa Catarina de Sena"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/image:scale-105"
                    />
                    
                    {/* Shadow cast on the spine edge for physical depth */}
                    <div className="absolute right-0 top-0 bottom-0 w-[15px] bg-gradient-to-l from-black/45 to-transparent z-10" />
                    
                    {/* Floating Overlay Info Badges */}
                    <div className="absolute top-4 left-4 z-20 bg-stone-950/70 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 flex items-center gap-1.5">
                      <Sparkles size={11} className="text-[#d4b098] animate-pulse" />
                      <span className="text-[8.5px] uppercase tracking-wider text-white/90 font-sans font-semibold">Património Histórico</span>
                    </div>

                    <div className="absolute bottom-4 left-4 z-20 bg-stone-950/70 backdrop-blur-md p-3 rounded border border-white/10 text-left max-w-[80%]">
                      <span className="font-serif italic text-white text-xs block font-semibold">A Capela de Pedra Solene</span>
                      <div className="flex items-center gap-1 text-white/70 text-[8px] uppercase tracking-widest mt-1">
                        <MapPin size={8} className="text-[#d4b098]" />
                        <span>Santa Catarina</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Page: Chapel Devotional Details */}
                  <div className="w-1/2 h-full p-10 pl-12 flex flex-col justify-between">
                    <div className="text-right text-[#7c5d43] uppercase text-[9px] tracking-widest font-sans font-bold">
                      Pág. 02
                    </div>
                    <div className="my-auto space-y-3">
                      <span className="font-sans text-[10px] tracking-widest uppercase text-[#7c5d43]/80 font-bold block">Crónica II</span>
                      <h3 className="text-2xl lg:text-3xl font-serif text-[#3d2715] font-light leading-snug">
                        Santuário de <span className="text-[#7c5d43] italic font-normal">Fé e Silêncio</span>
                      </h3>
                      <p className="text-[#3a2c20] text-xs lg:text-sm leading-relaxed font-serif font-light first-letter:text-4xl first-letter:font-serif first-letter:float-left first-letter:mr-2.5 first-letter:font-bold first-letter:text-[#7c5d43]">
                        Cravada na serenidade dos campos, a Capela de Santa Catarina de Sena ergue-se como um farol de fé inabalável. Com uma arquitetura rústica e pedra talhada localmente, serve há séculos como porto de abrigo espiritual das gentes beirãs.
                      </p>
                      <div className="p-3 bg-[#f2e9dc] rounded border border-[#7c5d43]/5">
                        <p className="text-[#5c4a3c] text-[10px] font-sans leading-relaxed">
                          É no adro desta capela rústica que as preces silenciosas se transformam em cânticos coletivos durante a procissão de primavera.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className="font-serif italic text-[10px] text-[#7c5d43]/70">Capítulo Segundo</span>
                    </div>
                  </div>
                </motion.div>

                {/* ===================== PAGE SPREAD 3: A ROMARIA ===================== */}
                <motion.div 
                  className="absolute inset-0 w-full h-full flex"
                  style={{ opacity: ch3Opacity, y: ch3Y, pointerEvents: ch3PointerEvents }}
                >
                  {/* Left Page: Procession Streets Portrait FULL BLEED */}
                  <div className="w-1/2 h-full relative overflow-hidden border-r border-stone-800/5 group/image">
                    <img 
                      src="/src/assets/images/ladoeiro_street_painted_1785366408881.jpg" 
                      alt="Ruas do Ladoeiro adornadas"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/image:scale-105"
                    />
                    
                    {/* Shadow cast on the spine edge for physical depth */}
                    <div className="absolute right-0 top-0 bottom-0 w-[15px] bg-gradient-to-l from-black/45 to-transparent z-10" />
                    
                    {/* Floating Overlay Info Badges */}
                    <div className="absolute top-4 left-4 z-20 bg-stone-950/70 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 flex items-center gap-1.5">
                      <Compass size={11} className="text-[#d4b098] animate-spin-slow" />
                      <span className="text-[8.5px] uppercase tracking-wider text-white/90 font-sans font-semibold">Cultura e Alma</span>
                    </div>

                    <div className="absolute bottom-4 left-4 z-20 bg-stone-950/70 backdrop-blur-md p-3 rounded border border-white/10 text-left max-w-[80%]">
                      <span className="font-serif italic text-white text-xs block font-semibold">Cortejo das Gentes</span>
                      <div className="flex items-center gap-1 text-white/70 text-[8px] uppercase tracking-widest mt-1">
                        <Calendar size={8} className="text-[#d4b098]" />
                        <span>Festa Tradicional</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Page: Chants & Adufes */}
                  <div className="w-1/2 h-full p-10 pl-12 flex flex-col justify-between">
                    <div className="text-right text-[#7c5d43] uppercase text-[9px] tracking-widest font-sans font-bold">
                      Pág. 03
                    </div>
                    <div className="my-auto space-y-3">
                      <span className="font-sans text-[10px] tracking-widest uppercase text-[#7c5d43]/80 font-bold block">Crónica III</span>
                      <h3 className="text-2xl lg:text-3xl font-serif text-[#3d2715] font-light leading-snug">
                        O Ritmo Solene <span className="text-[#7c5d43] italic font-normal">dos Adufes</span>
                      </h3>
                      <p className="text-[#3a2c20] text-xs lg:text-sm leading-relaxed font-serif font-light first-letter:text-4xl first-letter:font-serif first-letter:float-left first-letter:mr-2.5 first-letter:font-bold first-letter:text-[#7c5d43]">
                        Reunindo gerações num cortejo repleto de solenidade, a Romaria é a maior expressão de alma beirã. Ao som ritmado dos adufes e concertinas, as ruas enfeitam-se de flores silvestres para receber a imagem sagrada, unindo devoção e alegria rural.
                      </p>
                      <p className="text-[#4e3d30] text-[11px] leading-relaxed font-sans font-light italic">
                        "Cantam-se as modas que as avós ensinaram, num coro emocionante que ecoa nos vales."
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <span className="font-serif italic text-[10px] text-[#7c5d43]/70">Capítulo Terceiro</span>
                    </div>
                  </div>
                </motion.div>

                {/* ===================== PAGE SPREAD 4: BANQUETE ===================== */}
                <motion.div 
                  className="absolute inset-0 w-full h-full flex"
                  style={{ opacity: ch4Opacity, y: ch4Y, pointerEvents: ch4PointerEvents }}
                >
                  {/* Left Page: Watermelons of Ladoeiro FULL BLEED */}
                  <div className="w-1/2 h-full relative overflow-hidden border-r border-stone-800/5 group/image">
                    <img 
                      src="/src/assets/images/ladoeiro_melancia_painted_1785366725090.jpg" 
                      alt="Melancias doces do Ladoeiro"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/image:scale-105"
                    />
                    
                    {/* Shadow cast on the spine edge for physical depth */}
                    <div className="absolute right-0 top-0 bottom-0 w-[15px] bg-gradient-to-l from-black/45 to-transparent z-10" />
                    
                    {/* Floating Overlay Info Badges */}
                    <div className="absolute top-4 left-4 z-20 bg-stone-950/70 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 flex items-center gap-1.5">
                      <Compass size={11} className="text-[#d4b098]" />
                      <span className="text-[8.5px] uppercase tracking-wider text-white/90 font-sans font-semibold">Sabor e Partilha</span>
                    </div>

                    <div className="absolute bottom-4 left-4 z-20 bg-stone-950/70 backdrop-blur-md p-3 rounded border border-white/10 text-left max-w-[80%]">
                      <span className="font-serif italic text-white text-xs block font-semibold">Melancia Vermelha e Doce</span>
                      <div className="flex items-center gap-1 text-white/70 text-[8px] uppercase tracking-widest mt-1">
                        <MapPin size={8} className="text-[#d4b098]" />
                        <span>Festa da Melancia</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Page: Feast details */}
                  <div className="w-1/2 h-full p-10 pl-12 flex flex-col justify-between">
                    <div className="text-right text-[#7c5d43] uppercase text-[9px] tracking-widest font-sans font-bold">
                      Pág. 04
                    </div>
                    <div className="my-auto space-y-3">
                      <span className="font-sans text-[10px] tracking-widest uppercase text-[#7c5d43]/80 font-bold block">Crónica IV</span>
                      <h3 className="text-2xl lg:text-3xl font-serif text-[#3d2715] font-light leading-snug">
                        A Doçura do <span className="text-[#7c5d43] italic font-normal">Nosso Convívio</span>
                      </h3>
                      <p className="text-[#3a2c20] text-xs lg:text-sm leading-relaxed font-serif font-light first-letter:text-4xl first-letter:font-serif first-letter:float-left first-letter:mr-2.5 first-letter:font-bold first-letter:text-[#7c5d43]">
                        A festa do espírito prolonga-se nas mesas de partilha, onde a lendária doçura da melancia do Ladoeiro sacia a sede dos devotos e visitantes. Ao pão regional junta-se o vinho beirão e o queijo curado, simbolizando a hospitalidade sagrada de Idanha.
                      </p>
                      <p className="text-[#4e3d30] text-[11px] leading-relaxed font-sans font-light">
                        Não há estranhos no Ladoeiro durante a romaria; há apenas amigos que partilham o mesmo chão e a mesma fé.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <span className="font-serif italic text-[10px] text-[#7c5d43]/70">Capítulo Quarto</span>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* INTERACTIVE BOOK TAB INDEX (Side markers hanging outside the book page) */}
            <div className="absolute right-[-42px] top-1/4 flex flex-col gap-2.5 z-30">
              {["Solo", "Capela", "Festa", "Mesa"].map((label, idx) => {
                return (
                  <button
                    key={idx}
                    onClick={() => scrollToChapter(idx)}
                    className="relative px-2.5 py-3 w-[42px] text-left text-[8.5px] uppercase tracking-widest font-sans font-bold border-t border-b border-r border-[#d4b098]/20 rounded-r-md transition-all focus:outline-none cursor-pointer group"
                    style={{
                      backgroundColor: idx === currentChapter ? "#fbf7f0" : "#1e1009",
                      color: idx === currentChapter ? "#3d2715" : "#9e7d65",
                      boxShadow: idx === currentChapter ? "3px 1px 8px rgba(0,0,0,0.25)" : "none",
                      transform: idx === currentChapter ? "translateX(2px)" : "none"
                    }}
                  >
                    <div className="writing-vertical font-sans tracking-widest leading-none">
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ===================== MOBILE ADAPTIVE VIEW (Vertical Book Format) ===================== */}
          <div className="md:hidden w-full h-[80vh] flex flex-col bg-[#fbf7f0] rounded-xl border border-[#d4b098]/25 shadow-xl overflow-y-auto p-5 scrollbar-none">
            
            <div className="flex items-center justify-between border-b border-[#7c5d43]/20 pb-2.5 mb-5">
              <span className="font-serif italic text-xs text-[#7c5d43]">Crónicas do Ladoeiro</span>
              <span className="font-sans text-[8.5px] uppercase tracking-widest font-bold text-[#7c5d43]">Livraria Virtual</span>
            </div>

            <div className="space-y-10">
              
              {/* Mobile Chapter 1 */}
              <motion.div 
                className="space-y-3"
              >
                <span className="text-[8.5px] font-sans font-bold uppercase tracking-widest text-[#7c5d43] block">Capítulo I • Solo</span>
                <h3 className="text-xl font-serif text-[#3d2715]">O Ladoeiro & As Raízes</h3>
                <p className="text-[#3a2c20] text-xs leading-relaxed font-serif font-light">
                  Luzindo no coração da Beira Baixa, o Ladoeiro estende-se por planícies férteis de beleza agreste and generosa. O seu microclima e a dedicação das suas gentes moldaram uma identidade única, esculpida através de séculos de labuta e forte convívio comunitário.
                </p>
              </motion.div>

              {/* Mobile Chapter 2 */}
              <motion.div 
                className="space-y-3 pt-4 border-t border-[#7c5d43]/10"
              >
                <span className="text-[8.5px] font-sans font-bold uppercase tracking-widest text-[#7c5d43] block">Capítulo II • Capela</span>
                <h3 className="text-xl font-serif text-[#3d2715]">Santuário de Fé e Silêncio</h3>
                <img 
                  src="/src/assets/images/ladoeiro_chapel_painted_1785366432000.jpg" 
                  alt="Capela" 
                  className="w-full h-36 object-cover rounded shadow"
                />
                <p className="text-[#3a2c20] text-xs leading-relaxed font-serif font-light">
                  Cravada na serenidade dos campos, a Capela de Santa Catarina de Sena ergue-se como um farol de faith inabalável. Com uma arquitetura rústica e pedra talhada localmente, serve há séculos como porto de abrigo espiritual das gentes beirãs.
                </p>
              </motion.div>

              {/* Mobile Chapter 3 */}
              <motion.div 
                className="space-y-3 pt-4 border-t border-[#7c5d43]/10"
              >
                <span className="text-[8.5px] font-sans font-bold uppercase tracking-widest text-[#7c5d43] block">Capítulo III • Romaria</span>
                <h3 className="text-xl font-serif text-[#3d2715]">O Ritmo dos Adufes</h3>
                <p className="text-[#3a2c20] text-xs leading-relaxed font-serif font-light">
                  Reunindo gerações num cortejo repleto de solenidade, a Romaria é a maior expressão de alma beirã. Ao som ritmado dos adufes e concertinas, as ruas enfeitam-se de flores silvestres para receber a imagem sagrada, unindo devoção e alegria rural.
                </p>
              </motion.div>

              {/* Mobile Chapter 4 */}
              <motion.div 
                className="space-y-3 pt-4 border-t border-[#7c5d43]/10"
              >
                <span className="text-[8.5px] font-sans font-bold uppercase tracking-widest text-[#7c5d43] block">Capítulo IV • Mesa</span>
                <h3 className="text-xl font-serif text-[#3d2715]">A Doçura do Convívio</h3>
                <p className="text-[#3a2c20] text-xs leading-relaxed font-serif font-light">
                  A festa do espírito prolonga-se nas mesas de partilha, onde a lendária doçura da melancia do Ladoeiro sacia a sede dos devotos e visitantes. Ao pão regional junta-se o vinho beirão e o queijo curado, simbolizando a hospitalidade sagrada de Idanha.
                </p>
              </motion.div>

            </div>
          </div>
        </motion.div>

        {/* SCREEN 3: LADOEIRO GEOGRAPHICAL LOCATION STATE */}
        <motion.div
          style={{
            opacity: locOpacity,
            scale: locScale,
            y: locY,
            display: locDisplay,
          }}
          className="absolute inset-0 z-30 flex items-center justify-center px-4 md:px-8 lg:px-16 py-12"
        >
          <div className="w-full max-w-5xl bg-[#170e0a]/90 backdrop-blur-md rounded-2xl border border-[#d4b098]/15 p-6 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-[#e8ded1] flex flex-col md:flex-row gap-8 items-stretch relative">
            
            {/* Corner Bracket Details */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#d4b098]/30 rounded-tl-sm" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-[#d4b098]/30 rounded-tr-sm" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[#d4b098]/30 rounded-bl-sm" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[#d4b098]/30 rounded-br-sm" />

            {/* Left Column: Coordinates & Information */}
            <div className="w-full md:w-1/2 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-2 text-[#d4b098]">
                  <Map size={14} className="animate-pulse" />
                  <span className="font-sans uppercase text-[10px] tracking-[0.25em] font-bold">Onde Fica o Ladoeiro</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-serif font-light text-white leading-tight">
                  No coração da <span className="italic font-normal text-[#d4b098]">Beira Baixa</span>
                </h2>
                
                <p className="text-[#c5b8a9] text-xs md:text-sm leading-relaxed font-sans font-light">
                  Pertencente ao concelho de Idanha-a-Nova, o Ladoeiro repousa numa imensa planície delimitada a sul pelo rio Ponsul, onde a terra beirã se faz doce e fértil. Um lugar de horizontes abertos e gentes hospitaleiras.
                </p>
              </div>

              {/* Coordinates & Quick Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-[#d4b098]/80 font-sans block">Coordenadas</span>
                  <span className="font-serif text-sm text-white font-medium">39.9142° N, 7.2750° W</span>
                  <span className="text-[9.5px] font-sans text-[#a39485] block">Idanha-a-Nova, Portugal</span>
                </div>
                
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-[#d4b098]/80 font-sans block">Distâncias</span>
                  <span className="font-serif text-sm text-white font-medium">Castelo Branco (35km)</span>
                  <span className="text-[9.5px] font-sans text-[#a39485] block">Lisboa (250km) • Porto (300km)</span>
                </div>
              </div>

              {/* How to Get There Description */}
              <div className="flex items-start gap-3 bg-white/3 p-4 rounded-xl border border-white/5 text-left">
                <Info size={16} className="text-[#d4b098] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-sans uppercase tracking-widest text-white font-semibold">Como Chegar</h4>
                  <p className="text-[#a89a8c] text-[11px] leading-relaxed font-sans font-light">
                    Siga pela Autoestrada A23 até à saída de Castelo Branco. Continue pela N240 em direção a Idanha-a-Nova e siga a sinalização até ao Ladoeiro.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Stylized Vector Interactive Route Map */}
            <div className="w-full md:w-1/2 flex flex-col justify-between rounded-xl overflow-hidden bg-black/40 border border-[#d4b098]/15 relative min-h-[300px] md:min-h-auto p-6 text-left">
              
              {/* Decorative Abstract Map Background Graphics */}
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#d4b098_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-[#e69b5c]/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Simulated Roadmap Nodes */}
              <div className="relative w-full h-48 my-auto flex items-center justify-center">
                {/* Visual Route Connective Lines */}
                <svg className="absolute inset-0 w-full h-full stroke-[#d4b098]/20 stroke-[1.5] fill-none">
                  <path d="M 50 140 Q 150 70 220 90 T 380 30" strokeDasharray="4 4" className="animate-pulse" />
                  <path d="M 220 90 Q 280 160 350 140" strokeDasharray="4 4" />
                </svg>

                {/* Node 1: Castelo Branco */}
                <div className="absolute left-[10%] bottom-[25%] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#a89a8c] border-2 border-[#170e0a] z-10 shadow-lg" />
                  <span className="text-[9px] font-sans text-stone-400 mt-1 uppercase tracking-wider">C. Branco</span>
                </div>

                {/* Node 2: Ladoeiro (The Heart / Centerpiece) */}
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute left-[50%] top-[40%] -translate-x-1/2 flex flex-col items-center z-20"
                >
                  <div className="w-6 h-6 rounded-full bg-[#d4b098] border-4 border-[#170e0a] flex items-center justify-center shadow-[0_0_15px_rgba(212,176,152,0.6)]">
                    <MapPin size={10} className="text-[#170e0a]" />
                  </div>
                  <span className="text-[11px] font-serif font-bold text-white mt-1.5 uppercase tracking-widest drop-shadow">Ladoeiro</span>
                  <span className="text-[8px] font-sans text-[#d4b098] uppercase tracking-widest font-semibold">O Lar</span>
                </motion.div>

                {/* Node 3: Idanha-a-Nova */}
                <div className="absolute right-[12%] top-[15%] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#a89a8c] border-2 border-[#170e0a] z-10 shadow-lg" />
                  <span className="text-[9px] font-sans text-stone-400 mt-1 uppercase tracking-wider">Idanha</span>
                </div>

                {/* Node 4: Espanha / Alcantara */}
                <div className="absolute right-[15%] bottom-[15%] flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-stone-700 border border-black z-10" />
                  <span className="text-[8.5px] font-sans text-stone-500 mt-1 uppercase tracking-wider">Espanha</span>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="relative z-10 w-full mt-auto pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3 justify-between">
                <div className="flex items-center gap-2 text-[#a89a8c] text-[10px] font-sans">
                  <Globe size={13} className="text-[#d4b098]" />
                  <span>Raia Perdida, Beira Baixa</span>
                </div>
                
                <a 
                  href="https://www.google.com/maps/place/Ladoeiro/@39.9142,-7.2750,14z" 
                  target="_blank" 
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#d4b098] text-[#170e0a] hover:bg-white transition-all font-sans font-bold text-xs shadow-md tracking-wider uppercase group"
                >
                  <Navigation size={12} className="group-hover:rotate-12 transition-transform" />
                  <span>Ver no Google Maps</span>
                  <ArrowUpRight size={12} className="opacity-70" />
                </a>
              </div>

            </div>
          </div>
        </motion.div>

      </div>

    </div>

    {/* Standard Homepage Footer */}
    <Footer />
  </div>
);
}
