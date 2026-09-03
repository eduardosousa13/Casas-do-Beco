import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReservationModal from './ReservationModal';

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const CornerBorders = () => (
  <>
    <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-white/40 pointer-events-none transition-all duration-700 group-hover:border-white/90 group-hover:w-10 group-hover:h-10 z-30" />
    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/40 pointer-events-none transition-all duration-700 group-hover:border-white/90 group-hover:w-10 group-hover:h-10 z-30" />
    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-white/40 pointer-events-none transition-all duration-700 group-hover:border-white/90 group-hover:w-10 group-hover:h-10 z-30" />
    <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-white/40 pointer-events-none transition-all duration-700 group-hover:border-white/90 group-hover:w-10 group-hover:h-10 z-30" />
  </>
);

const interiorImages = [
  "/src/assets/images/rural_interior_casual_1785293075431.jpg",
  "/src/assets/images/rural_interior_living_room_1785336640534.jpg",
  "/src/assets/images/rural_interior_bedroom_1785336656544.jpg",
  "/src/assets/images/rural_interior_bathroom_1785336726271.jpg",
  "/src/assets/images/rural_interior_kitchen_1785336672218.jpg",
  "/src/assets/images/rural_interior_details_1785336743460.jpg"
];

const itemWidth = 320;
const gap = 24;
const cardWidth = itemWidth + gap;
const totalWidth = cardWidth * interiorImages.length; // 6 * 344 = 2064

const InteriorSlider = () => {
  const baseX = useMotionValue(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
     let id: number;
     let lastTime = performance.now();
     
     const update = (time: number) => {
         const delta = time - lastTime;
         lastTime = time;
         
         // Auto advance baseX, approx 30px per second
         baseX.set(baseX.get() - (delta * 0.03));
         
         id = requestAnimationFrame(update);
     };
     
     id = requestAnimationFrame(update);
     return () => cancelAnimationFrame(id);
  }, [baseX]);

  // MacBook/Touchpad horizontal scroll gesture support
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const onWheel = (e: WheelEvent) => {
      // Horizontal scrolling from trackpad
      if (Math.abs(e.deltaX) > 0.2) {
        e.preventDefault();
        baseX.set(baseX.get() - e.deltaX * 1.5);
      }
      // Vertical scrolling with Shift key (horizontal scroll on desktop)
      else if (e.shiftKey && Math.abs(e.deltaY) > 0.2) {
        e.preventDefault();
        baseX.set(baseX.get() - e.deltaY * 1.5);
      }
    };

    slider.addEventListener('wheel', onWheel, { passive: false });
    return () => slider.removeEventListener('wheel', onWheel);
  }, [baseX]);

  const smoothX = useSpring(baseX, { damping: 50, stiffness: 400 });
  const transformX = useTransform(smoothX, (v) => `${wrap(-totalWidth, 0, v)}px`);

  const handleNext = () => {
     baseX.set(baseX.get() - cardWidth * 3); // Advance 3 images
  };

  const handlePrev = () => {
     baseX.set(baseX.get() + cardWidth * 3); // Go back 3 images
  };

  // 4 sets of images for seamless wrap even on ultrawide monitors
  const images = [...interiorImages, ...interiorImages, ...interiorImages, ...interiorImages];

  return (
    <div ref={sliderRef} className="w-full relative overflow-hidden group/slider pointer-events-auto py-4">
      <motion.div 
        className="flex"
        style={{ x: transformX, gap: `${gap}px` }}
      >
        {images.map((src, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 overflow-hidden bg-[#0a0604] border border-white/10"
            style={{ width: `${itemWidth}px`, aspectRatio: '4/3' }}
          >
            <img src={src} alt="Interior" className="w-full h-full object-cover opacity-100 hover:scale-105 transition-all duration-700" />
          </div>
        ))}
      </motion.div>

      <button
        className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#d4b098]/80 backdrop-blur-sm border border-white/20"
        onClick={handlePrev}
      >
        <ChevronLeft size={28} />
      </button>
      <button
        className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#d4b098]/80 backdrop-blur-sm border border-white/20"
        onClick={handleNext}
      >
        <ChevronRight size={28} />
      </button>
      
      {/* Gradients to fade out edges */}
      <div className="absolute inset-y-0 left-0 w-12 md:w-32 bg-gradient-to-r from-[#0a0604] via-[#0a0604]/80 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 md:w-32 bg-gradient-to-l from-[#0a0604] via-[#0a0604]/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [logoError, setLogoError] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track scroll progress over the 550vh container for 5 distinct states
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Background Parallax & Zoom
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.35]);
  
  // Background Transition (Crossfade to lighter image during State 3 and 4)
  const bgLightImageOpacity = useTransform(scrollYProgress, [0.15, 0.25, 0.65, 0.75], [0, 1, 1, 0]);

  // Darken the background during the interactive slider state (State 5)
  const sliderBgOverlayOpacity = useTransform(scrollYProgress, [0.60, 0.72], [0, 0.85]);

  // Logo Animation (Center -> Header Center)
  const logoTop = useTransform(scrollYProgress, [0, 0.1], ["50%", "12%"]);
  const logoY = useTransform(scrollYProgress, [0, 0.1], ["-50%", "0%"]);
  const logoScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.35]);
  
  // Scroll Indicator Fading Out
  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  // State 2: Middle Content Reveal
  const content1Opacity = useTransform(scrollYProgress, [0.05, 0.15, 0.2, 0.25], [0, 1, 1, 0]);
  const content1Y = useTransform(scrollYProgress, [0.05, 0.15, 0.2, 0.25], [40, 0, 0, -40]);

  // Header Opacity
  const headerOpacity = useTransform(scrollYProgress, [0.05, 0.15], [0, 1]);

  // State 3: Ladoeiro Info & Images
  const content2Opacity = useTransform(scrollYProgress, [0.25, 0.35, 0.4, 0.45], [0, 1, 1, 0]);
  const content2Y = useTransform(scrollYProgress, [0.25, 0.35, 0.4, 0.45], [40, 0, 0, -40]);
  const img1Y = useTransform(scrollYProgress, [0.25, 0.45], [100, -50]);
  const img2Y = useTransform(scrollYProgress, [0.25, 0.45], [150, -100]);

  // State 4: Festas & Tradições
  const content3Opacity = useTransform(scrollYProgress, [0.45, 0.55, 0.6, 0.65], [0, 1, 1, 0]);
  const content3Y = useTransform(scrollYProgress, [0.45, 0.55, 0.6, 0.65], [40, 0, 0, -40]);
  const img3Y = useTransform(scrollYProgress, [0.45, 0.65], [80, -30]);
  const img4Y = useTransform(scrollYProgress, [0.45, 0.65], [-30, 80]);

  // State 5: Video Section Reveal
  const videoOpacity = useTransform(scrollYProgress, [0.65, 0.75], [0, 1]);
  const videoY = useTransform(scrollYProgress, [0.65, 0.75], [60, 0]);

  // Mouse Parallax Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const springConfig = { damping: 30, stiffness: 100, mass: 0.5 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const bgMouseX = useTransform(smoothMouseX, [-1, 1], ["2%", "-2%"]);
  const bgMouseY = useTransform(smoothMouseY, [-1, 1], ["2%", "-2%"]);
  
  const contentMouseX = useTransform(smoothMouseX, [-1, 1], ["-1%", "1%"]);

  if (isMobile) {
    return (
      <div className="relative w-full bg-[#0a0604] text-white">
        <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
        
        {/* Mobile Header / Floating Nav */}
        <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[#0a0604]/90 backdrop-blur-md border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            {!logoError ? (
              <img 
                src="/src/assets/images/logo.png" 
                alt="Casas do Beco" 
                className="h-6 w-auto invert brightness-0" 
                onError={() => setLogoError(true)} 
              />
            ) : (
              <span className="font-serif tracking-widest text-sm text-white font-light">CASAS DO BECO</span>
            )}
          </Link>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsReservationOpen(true)}
              className="text-[9px] tracking-widest uppercase border border-white/20 hover:bg-white hover:text-black px-4 py-2 font-sans transition-all cursor-pointer"
            >
              Reservas
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white/85 hover:text-white p-1 focus:outline-none"
            >
              <Menu size={20} />
            </button>
          </div>
        </nav>

        {/* Mobile Hamburger Drawer Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-50 bg-[#0a0604] flex flex-col justify-center items-center p-8 pt-24 animate-none"
            >
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-5 right-6 text-white/70 hover:text-white p-2"
              >
                <X size={24} />
              </button>
              <div className="flex flex-col items-center gap-8 text-center">
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-serif text-3xl text-white hover:text-[#d4b098] transition-colors"
                >
                  Início
                </Link>
                <a 
                  href="#casas" 
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('casas')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="font-serif text-3xl text-white hover:text-[#d4b098] transition-colors"
                >
                  As Nossas Casas
                </a>
                <Link 
                  to="/onde-estamos" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-serif text-3xl text-white hover:text-[#d4b098] transition-colors"
                >
                  Onde Estamos
                </Link>
                <Link 
                  to="/sobre-nos" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-serif text-3xl text-white hover:text-[#d4b098] transition-colors"
                >
                  Sobre Nós
                </Link>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsReservationOpen(true);
                  }}
                  className="mt-4 text-[#d4b098] border border-[#d4b098]/30 px-8 py-3 text-xs tracking-widest uppercase hover:bg-[#d4b098] hover:text-black font-sans transition-all"
                >
                  Efetuar Reserva
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Mobile Hero Landing */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
          {/* Background picture */}
          <div className="absolute inset-0 z-0">
            <img src="/src/assets/images/home_hero_bg.png" alt="Ladoeiro" className="w-full h-full object-cover opacity-35 animate-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0604]/20 via-[#0a0604]/60 to-[#0a0604]" />
          </div>

          <div className="relative z-10 max-w-lg space-y-6 flex flex-col items-center pt-8">
            {!logoError ? (
              <img src="/src/assets/images/logo.png" alt="Casas do Beco" className="w-64 h-auto object-contain brightness-0 invert opacity-90" onError={() => setLogoError(true)} />
            ) : (
              <h1 className="text-white font-serif text-3xl tracking-[0.2em] font-light">CASAS DO BECO</h1>
            )}
            
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-8 bg-[#d4b098]/50"></div>
              <p className="text-[#d4b098] font-sans tracking-[0.3em] uppercase text-[9px] font-semibold">Ladoeiro • Idanha-a-Nova</p>
              <div className="h-[1px] w-8 bg-[#d4b098]/50"></div>
            </div>

            <p className="text-stone-300 font-sans text-xs font-light max-w-sm leading-relaxed">
              Uma experiência de luxo rural e serenidade no coração da planície albicastrense.
            </p>

            <div className="pt-4 animate-bounce">
              <ChevronDown className="text-[#d4b098]" size={20} />
            </div>
          </div>
        </section>

        {/* 2. Mobile Section: Onde a Tradição Encontra o Luxo */}
        <section id="sobre-nos" className="py-20 px-6 border-t border-white/5 bg-[#0a0604] relative">
          <div className="max-w-md mx-auto space-y-6 text-center">
            <h2 className="text-white font-serif text-3xl font-light">Onde a Tradição Encontra o Luxo</h2>
            <div className="w-12 h-[1px] bg-[#d4b098]/40 mx-auto" />
            <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
              Uma experiência exclusiva no coração da planície albicastrense. Mergulhe na serenidade rural com o conforto e a sofisticação que merece.
            </p>
            <button 
              onClick={() => {
                const casasSec = document.getElementById('casas');
                if (casasSec) {
                  casasSec.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: window.innerHeight * 1.8, behavior: 'smooth' });
                }
              }}
              className="inline-block text-[#d4b098] border border-[#d4b098]/20 px-8 py-3.5 text-[9px] tracking-widest uppercase hover:bg-white hover:text-black transition-all font-sans cursor-pointer"
            >
              Explorar a Estadia
            </button>
          </div>
        </section>

        {/* 3. Mobile Section: Planicie Albicastrense */}
        <section className="py-20 px-6 bg-[#0f0b09] border-t border-white/5 relative">
          <div className="max-w-md mx-auto space-y-8 text-left">
            <div className="space-y-4">
              <h3 className="text-white font-serif text-3xl font-light leading-tight">A Planície Albicastrense</h3>
              <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
                Ladoeiro é sinónimo de terra fértil e horizontes vastos. Conhecida pelas suas planícies e agricultura rica, a aldeia oferece uma imersão na cultura tradicional portuguesa, onde o tempo corre devagar e a natureza dita o ritmo.
              </p>
            </div>
            
            {/* Portrait layout image with Corner Borders */}
            <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10">
              <img src="/src/assets/images/ladoeiro_streets_1785294645315.jpg" alt="Ruas de Ladoeiro" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              <CornerBorders />
            </div>

            <div className="text-center pt-2">
              <Link 
                to="/onde-estamos" 
                className="inline-block text-white border border-white/20 px-8 py-3.5 text-[9px] tracking-widest uppercase hover:bg-white hover:text-black transition-all font-sans"
              >
                Descobrir a Região
              </Link>
            </div>
          </div>
        </section>

        {/* 4. Mobile Section: Festas e Tradições */}
        <section className="py-20 px-6 bg-[#0a0604] border-t border-white/5 relative">
          <div className="max-w-md mx-auto space-y-8 text-left">
            <div className="space-y-4">
              <h3 className="text-white font-serif text-3xl font-light leading-tight">Festas e Tradições</h3>
              <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
                A vida no Ladoeiro é marcada pelas suas gentes e costumes. O famoso <strong>Festival da Melancia</strong> celebra a colheita mais doce da região, trazendo vida, cor e alegria às ruas da aldeia.
              </p>
              <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
                No coração da fé local, ergue-se a capela de <strong>Santa Catarina</strong>, protetora e padroeira, símbolo da devoção inabalável de uma comunidade unida.
              </p>
            </div>

            {/* Stacked Images */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[4/5] border border-white/10 overflow-hidden">
                <img src="/src/assets/images/melancia_festival_1785295293389.jpg" alt="Melancia Festival" className="w-full h-full object-cover opacity-80" />
                <CornerBorders />
              </div>
              <div className="relative aspect-[4/5] border border-white/10 overflow-hidden">
                <img src="/src/assets/images/santa_catarina_chapel_1785295305778.jpg" alt="Capela de Santa Catarina" className="w-full h-full object-cover opacity-80" />
                <CornerBorders />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Mobile Section: Interiores Slider */}
        <section className="py-20 px-6 bg-[#0f0b09] border-t border-b border-white/5 relative overflow-hidden">
          <div className="max-w-md mx-auto space-y-6 text-center">
            <h3 className="text-white font-serif text-3xl font-light">Os Nossos Interiores</h3>
            <div className="w-12 h-[1px] bg-[#d4b098]/40 mx-auto" />
            <p className="text-stone-400 font-sans text-xs font-light max-w-sm mx-auto leading-relaxed">
              Cada detalhe foi cuidadosamente desenhado para honrar a traça regional com sofisticação contemporânea.
            </p>
          </div>
          
          <div className="mt-8 -mx-6">
            <InteriorSlider />
          </div>
        </section>

      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[550vh] bg-[#0a0604]">
      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      {/* Sticky viewport frame */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        
        {/* Background Image */}
        <motion.div 
          className="absolute inset-0 z-0 origin-center w-[110%] h-[110%] -left-[5%] -top-[5%]" 
          style={{ 
            scale: bgScale,
            x: bgMouseX,
            y: bgMouseY
          }}
        >
          <img 
            src="/src/assets/images/home_hero_bg.png" 
            alt="Ladoeiro Landscape"
            className="w-full h-full object-cover opacity-90"
          />
          {/* Lighter Daytime Background fading in for State 3 */}
          <motion.img 
            src="/src/assets/images/home_bg_2.png" 
            alt="Ladoeiro Landscape Daytime"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            style={{ opacity: bgLightImageOpacity }}
          />
          
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0604]/80 via-[#0a0604]/20 to-[#0a0604]/90" />
          
          {/* Darken background specifically during the interactive slider state */}
          <motion.div 
            className="absolute inset-0 bg-[#0a0604]"
            style={{ opacity: sliderBgOverlayOpacity }}
          />
        </motion.div>

        {/* Animated Logo */}
        <motion.div 
          className="absolute left-0 w-full flex justify-center z-40 pointer-events-none origin-top"
          style={{ 
            top: logoTop, 
            y: logoY, 
            scale: logoScale,
            x: contentMouseX
          }}
        >
          {!logoError ? (
            <img 
              src="/src/assets/images/logo.png" 
              alt="Casas do Beco" 
              className="w-72 md:w-96 lg:w-[450px] h-auto object-contain drop-shadow-2xl brightness-0 invert opacity-90 pointer-events-auto"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex flex-col items-center drop-shadow-2xl pointer-events-auto">
               <h1 className="text-white tracking-[0.2em] font-serif text-4xl text-center font-light">CASAS<br/>DO BECO</h1>
            </div>
          )}
        </motion.div>

        {/* Animated Header */}
        <motion.div
          className="absolute top-0 left-0 w-full px-6 md:px-12 py-8 flex flex-col md:flex-row justify-between items-center z-50 pointer-events-none hidden md:flex"
          style={{ opacity: headerOpacity }}
        >
          {/* Left Navigation */}
          <div className="flex space-x-8 pointer-events-auto flex-1">
            {['Sobre Nós', 'Onde Estamos', 'Contactos'].map((item) => {
              if (item === 'Onde Estamos') {
                return (
                  <Link key={item} to="/onde-estamos" className="text-white/80 hover:text-white font-sans text-[10px] tracking-widest uppercase transition-colors drop-shadow-md">
                    {item}
                  </Link>
                );
              } else if (item === 'Sobre Nós') {
                return (
                  <Link key={item} to="/sobre-nos" className="text-white/80 hover:text-white font-sans text-[10px] tracking-widest uppercase transition-colors drop-shadow-md">
                    {item}
                  </Link>
                );
              } else {
                return (
                  <Link key={item} to="/contactos" className="text-white/80 hover:text-white font-sans text-[10px] tracking-widest uppercase transition-colors drop-shadow-md">
                    {item}
                  </Link>
                );
              }
            })}
          </div>
          
          {/* Center spacer for logo */}
          <div className="flex-1"></div>

          {/* Right Navigation */}
          <div className="flex items-center justify-end space-x-8 pointer-events-auto flex-1">
            <div className="flex items-center space-x-3 text-white/80 font-sans text-[10px] tracking-widest uppercase">
              <button className="hover:text-white transition-colors text-white font-semibold">PT</button>
              <span className="text-white/30">|</span>
              <button className="hover:text-white transition-colors">EN</button>
            </div>
            
            <button 
              onClick={() => setIsReservationOpen(true)}
              className="text-white hover:text-black font-sans text-[10px] tracking-widest uppercase transition-colors drop-shadow-md border border-white/30 hover:bg-white px-6 py-3 backdrop-blur-sm cursor-pointer"
            >
              Reservas
            </button>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-10 left-0 w-full flex flex-col items-center justify-center z-30 pointer-events-none"
          style={{ opacity: indicatorOpacity }}
        >
           <span className="text-white/60 font-sans tracking-[0.3em] uppercase text-xs mb-4">Descubra</span>
           <motion.div 
             animate={{ y: [0, 8, 0] }} 
             transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
           >
             <ChevronDown className="text-white/60" size={24} strokeWidth={1} />
           </motion.div>
        </motion.div>

        {/* State 2 Middle Content */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none mt-[15vh] px-6"
          style={{ 
            opacity: content1Opacity, 
            y: content1Y,
            x: contentMouseX,
          }}
        >
           <div className="pointer-events-auto flex flex-col items-center max-w-3xl text-center">
             <div className="flex items-center space-x-4 mb-6">
                <div className="h-[1px] w-12 bg-[#d4b098]/50"></div>
                <p className="text-[#d4b098] font-sans tracking-[0.4em] uppercase text-[10px] md:text-xs drop-shadow-md">
                  Ladoeiro • Idanha-a-Nova
                </p>
                <div className="h-[1px] w-12 bg-[#d4b098]/50"></div>
             </div>
             
             <h2 className="text-white font-serif text-4xl md:text-5xl lg:text-6xl leading-tight mb-8 drop-shadow-2xl font-light">
               Onde a Tradição <br className="hidden md:block" /> Encontra o <span className="italic text-white/90">Luxo</span>
             </h2>
             
             <p className="text-white/70 font-sans font-light tracking-wide text-sm md:text-base leading-relaxed mb-10 max-w-lg drop-shadow-md">
               Uma experiência exclusiva no coração da planície albicastrense. Mergulhe na serenidade rural com o conforto e a sofisticação que merece.
             </p>
             
             <button className="text-white border border-white/30 px-10 py-4 text-[10px] md:text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-500 backdrop-blur-sm">
               Explorar a Estadia
             </button>
           </div>
        </motion.div>
        
        {/* State 3 Ladoeiro Info & Images */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none mt-[10vh] px-6 md:px-12"
          style={{ 
            opacity: content2Opacity, 
            y: content2Y,
            x: contentMouseX,
          }}
        >
           <div className="pointer-events-auto flex flex-col md:flex-row items-center justify-center max-w-6xl w-full gap-8 md:gap-16">
              
              {/* Left Text Block */}
              <div className="w-full md:w-1/2 text-left z-10">
                <h3 className="text-white font-serif text-3xl md:text-5xl leading-tight mb-6 drop-shadow-2xl font-light">
                  A Planície <br/> Albicastrense
                </h3>
                <p className="text-white/80 font-sans font-medium tracking-wide text-sm md:text-base leading-relaxed mb-8 max-w-lg drop-shadow-md">
                  Ladoeiro é sinónimo de terra fértil e horizontes vastos. Conhecida pelas suas planícies e agricultura rica, a aldeia oferece uma imersão na cultura tradicional portuguesa, onde o tempo corre devagar e a natureza dita o ritmo.
                </p>
                <button className="text-white border border-white/30 px-10 py-4 text-[10px] md:text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-500 backdrop-blur-sm">
                  Descobrir a Região
                </button>
              </div>

              {/* Right Images with Parallax */}
              <div className="w-full md:w-1/2 relative h-[500px] md:h-[650px] flex items-center justify-center">
                  {/* Background typography for depth */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <span className="text-[120px] md:text-[180px] font-serif font-bold text-white/5 whitespace-nowrap -rotate-90">
                          ALDEIA
                      </span>
                  </div>
                 
                 {/* Main Image - Large elegant portrait */}
                 <motion.div 
                   className="absolute right-0 md:right-8 top-0 bottom-0 my-auto h-[90%] w-full sm:w-[85%] aspect-[3/4] group z-20"
                   style={{ y: img1Y }}
                 >
                   <div className="absolute inset-4 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] bg-[#0a0604]">
                       <img src="/src/assets/images/ladoeiro_streets_1785294645315.jpg" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-[3s] ease-out" alt="Ruas do Ladoeiro" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                   </div>
                   <CornerBorders />
                 </motion.div>
              </div>

           </div>
        </motion.div>

        {/* State 4 Festas & Tradições */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none mt-[10vh] px-6 md:px-12"
          style={{ 
            opacity: content3Opacity, 
            y: content3Y,
            x: contentMouseX,
          }}
        >
           <div className="pointer-events-auto flex flex-col md:flex-row-reverse items-center justify-center max-w-6xl w-full gap-8 md:gap-16">
              
              {/* Right Text Block */}
              <div className="w-full md:w-1/2 text-left z-10">
                <h3 className="text-white font-serif text-3xl md:text-5xl leading-tight mb-6 drop-shadow-2xl font-light">
                  Festas e <br/> Tradições
                </h3>
                <p className="text-white/90 font-sans font-medium tracking-wide text-sm md:text-base leading-relaxed mb-6 max-w-lg drop-shadow-md">
                  A vida no Ladoeiro é marcada pelas suas gentes e costumes. O famoso <strong>Festival da Melancia</strong> celebra a colheita mais doce da região, trazendo vida, cor e alegria às ruas da aldeia.
                </p>
                <p className="text-white/90 font-sans font-medium tracking-wide text-sm md:text-base leading-relaxed mb-8 max-w-lg drop-shadow-md">
                  No coração da fé local, ergue-se a capela de <strong>Santa Catarina</strong>, protetora e padroeira, símbolo da devoção inabalável de uma comunidade unida.
                </p>
              </div>

              {/* Left Images with Parallax */}
              <div className="w-full md:w-1/2 relative h-[600px] flex justify-between">
                 {/* Decorative background element */}
                 <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-white/10 blur-[2px] pointer-events-none z-0" />

                 {/* Melancia Image */}
                 <motion.div 
                   className="absolute left-0 top-8 w-[46%] aspect-[4/5] group z-20"
                   style={{ y: img3Y }}
                 >
                   <div className="absolute inset-2 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] bg-[#0a0604]">
                       <img src="/src/assets/images/melancia_festival_1785295293389.jpg" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[3s] ease-out" alt="Festival da Melancia" />
                       <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-30 flex items-end">
                         <span className="text-white font-sans text-xs tracking-widest uppercase drop-shadow-md">Festival Anual</span>
                       </div>
                   </div>
                   <CornerBorders />
                 </motion.div>
                 
                 {/* Santa Catarina Image */}
                 <motion.div 
                   className="absolute right-0 bottom-8 w-[46%] aspect-[3/4] group z-10"
                   style={{ y: img4Y }}
                 >
                   <div className="absolute inset-2 overflow-hidden bg-[#0a0604] shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
                       <img src="/src/assets/images/santa_catarina_chapel_1785295305778.jpg" className="w-full h-full object-cover transform hover:scale-105 transition-all duration-[3s]" alt="Capela de Santa Catarina" />
                   </div>
                   <CornerBorders />
                 </motion.div>
              </div>

           </div>
        </motion.div>

        {/* State 5 Video Content */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none mt-[10vh]"
          style={{ 
            opacity: videoOpacity, 
            y: videoY,
            x: contentMouseX,
          }}
        >
           <div className="pointer-events-auto flex flex-col items-center justify-center w-full gap-8">
              
              {/* Marquee Carousel */}
              <div className="w-full relative mt-4">
                 <InteriorSlider />
              </div>
              
           </div>
        </motion.div>

      </div>
    </div>
  );
}
