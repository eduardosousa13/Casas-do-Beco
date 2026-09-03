import { motion, useInView } from 'framer-motion';
import React, { useRef, useState } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import ReservationModal from './ReservationModal';

export default function ReservationCTA() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setMousePosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <section 
      ref={containerRef}
      className="relative w-full py-20 md:py-24 bg-[#0a0604] overflow-hidden flex items-center justify-center border-t border-b border-white/5"
    >
      {/* Animated Background Elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#d4b098] rounded-full blur-[100px] md:blur-[120px] opacity-20 pointer-events-none"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute bottom-0 right-1/4 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-[#ffffff] rounded-full blur-[100px] md:blur-[150px] opacity-10 pointer-events-none"
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgNDBoNDBWMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')] opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
          animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.5, rotate: -15 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-8"
        >
          <div className="w-16 h-16 rounded-full border border-[#d4b098]/30 flex items-center justify-center bg-[#d4b098]/10 backdrop-blur-sm">
            <Calendar className="w-6 h-6 text-[#d4b098]" />
          </div>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-3xl md:text-4xl lg:text-5xl font-serif font-light text-white mb-5 leading-tight drop-shadow-lg"
        >
          A Sua <span className="italic text-[#d4b098]">Fuga</span> Perfeita <br className="hidden md:block" />
          Começa Aqui
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="text-white/70 font-sans font-light max-w-lg mx-auto mb-10 text-sm leading-relaxed"
        >
          Desconecte-se da rotina e mergulhe na tranquilidade. 
          Garanta já a sua estadia nas Casas do Ladoeiro e prepare-se para viver momentos inesquecíveis no coração da natureza.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-[#d4b098] mb-4 font-light">
            Verificar disponibilidade
          </span>

          {/* Magnetic Button */}
          <motion.button
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setIsReservationOpen(true)}
          animate={isInView ? { x: mousePosition.x * 0.15, y: mousePosition.y * 0.15, opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9, x: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative group bg-white text-black px-10 py-5 flex items-center gap-4 overflow-hidden hover:text-white transition-colors duration-500 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(212,176,152,0.3)] cursor-pointer"
        >
          <span className="relative z-10 font-sans uppercase tracking-[0.2em] text-[10px] md:text-xs font-semibold">
            Reservar Agora
          </span>
          <motion.span 
            className="relative z-10"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowRight size={16} />
          </motion.span>

          {/* Hover effect background */}
          <div className="absolute inset-0 bg-[#d4b098] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
          </motion.button>
        </motion.div>

        {/* Decorative lines crosshair */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
          className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" 
        />
        <motion.div 
          initial={{ scaleY: 0 }}
          animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
          className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" 
        />

        {/* Global Reservation Choice Popup Modal */}
        <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />

      </div>
    </section>
  );
}
