import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BedDouble, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  const navigate = useNavigate();

  const handleSelect = (houseId: 'nascente' | 'poente') => {
    onClose();
    navigate(`/casas/${houseId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div 
            className="relative bg-[#0d0907] border border-white/10 p-8 md:p-12 max-w-2xl w-full text-left shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors cursor-pointer focus:outline-none p-2"
            >
              <X size={20} />
            </button>

            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-[#d4b098] font-sans tracking-[0.25em] uppercase text-[10px] font-semibold block">Escolha o seu Refúgio</span>
                <h3 className="text-white font-serif text-3xl font-light">Casas do Beco</h3>
                <p className="text-stone-400 font-sans text-xs font-light max-w-md leading-relaxed">
                  As nossas moradias geminadas situam-se lado a lado no Ladoeiro. Escolha o espaço ideal para a sua estadia.
                </p>
              </div>

              {/* Selection cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Casa Nascente */}
                <button
                  onClick={() => handleSelect('nascente')}
                  className="group relative flex flex-col justify-end text-left border border-white/10 p-6 bg-black/40 hover:border-[#d4b098]/40 transition-all cursor-pointer aspect-[4/3] overflow-hidden focus:outline-none w-full"
                >
                  <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40 group-hover:scale-105 group-hover:opacity-50 transition-all duration-1000" style={{ backgroundImage: `url('/src/assets/images/village_house_1_1785331307550.jpg')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                  
                  <div className="relative z-20 space-y-3">
                    <span className="text-[#d4b098] font-sans text-[8px] tracking-widest uppercase font-semibold">Grande Refúgio</span>
                    <h4 className="text-white font-serif text-xl font-light group-hover:text-[#d4b098] transition-colors">Casa Nascente • T4</h4>
                    <div className="flex gap-4 text-[10px] text-white/60 font-sans font-light">
                      <span className="flex items-center gap-1"><BedDouble size={12} /> 4 Quartos</span>
                      <span className="flex items-center gap-1"><User size={12} /> Até 10 Pessoas</span>
                    </div>
                  </div>
                </button>

                {/* Casa Poente */}
                <button
                  onClick={() => handleSelect('poente')}
                  className="group relative flex flex-col justify-end text-left border border-white/10 p-6 bg-black/40 hover:border-[#d4b098]/40 transition-all cursor-pointer aspect-[4/3] overflow-hidden focus:outline-none w-full"
                >
                  <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40 group-hover:scale-105 group-hover:opacity-50 transition-all duration-1000" style={{ backgroundImage: `url('/src/assets/images/village_house_2_1785331327631.jpg')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                  
                  <div className="relative z-20 space-y-3">
                    <span className="text-[#d4b098] font-sans text-[8px] tracking-widest uppercase font-semibold">Refúgio Romântico</span>
                    <h4 className="text-white font-serif text-xl font-light group-hover:text-[#d4b098] transition-colors">Casa Poente • T1</h4>
                    <div className="flex gap-4 text-[10px] text-white/60 font-sans font-light">
                      <span className="flex items-center gap-1"><BedDouble size={12} /> 1 Suite</span>
                      <span className="flex items-center gap-1"><User size={12} /> Até 3 Pessoas</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Shared notes */}
              <div className="text-center pt-4 border-t border-white/5">
                <p className="text-[10px] text-stone-500 font-sans tracking-wide">
                  Deseja reservar ambas as casas? <span className="text-[#d4b098]">Contacte-nos</span> diretamente para condições especiais de grupo.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
