import { motion } from 'motion/react';
import { MapPin, Navigation, Compass, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Location() {
  return (
    <section className="relative bg-[#0a0604] py-32 px-6 md:px-12 min-h-screen flex items-center justify-center overflow-hidden">
      {/* Decorative background grid/lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-[10%] w-[1px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        <div className="absolute top-[50%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute top-0 right-[10%] w-[1px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </div>

      {/* Large background watermark logo */}
      <motion.div 
        className="absolute -left-[10%] top-1/2 transform -translate-y-1/2 opacity-[0.02] pointer-events-none z-0"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.03, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        viewport={{ once: false }}
      >
        <img src="/src/assets/images/logo.png" alt="" className="w-[800px] h-[800px] object-contain invert brightness-0" />
      </motion.div>

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 relative z-10 items-center">
        
        {/* Left Content */}
        <motion.div 
          className="lg:col-span-5 flex flex-col items-start"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.2, margin: "-50px" }}
        >
          <div className="flex flex-row items-center justify-between w-full mb-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light tracking-wide text-white drop-shadow-sm">
              Onde <br className="hidden lg:block" />
              <span className="italic text-white/70">Estamos</span>
            </h2>
            <img 
              src="/src/assets/images/logo.png" 
              alt="Logo Ladoeiro" 
              className="w-20 md:w-24 h-auto invert brightness-0 opacity-80 ml-8"
            />
          </div>
          
          <div className="w-16 h-[1px] bg-[#d4b098]/60 mb-8" />
          
          <p className="text-white/60 font-sans font-light tracking-wide text-base md:text-lg leading-relaxed mb-10">
            Localizadas no Ladoeiro, uma freguesia pacata no coração da Beira Baixa. Um refúgio autêntico onde o tempo abranda e a planície se estende até ao horizonte, fundindo a tradição com a serenidade da natureza.
          </p>

          <div className="flex flex-col gap-6 mb-12 w-full">
            <div className="flex items-center gap-5 p-4 border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-black/50">
                <MapPin strokeWidth={1} className="w-5 h-5 text-[#d4b098]" />
              </div>
              <div>
                <h4 className="font-serif text-lg tracking-wider text-white">Ladoeiro</h4>
                <p className="font-sans text-xs text-white/50 uppercase tracking-widest mt-1">Idanha-a-Nova, Portugal</p>
              </div>
            </div>

            <div className="flex items-center gap-5 p-4 border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-black/50">
                <Compass strokeWidth={1} className="w-5 h-5 text-[#d4b098]" />
              </div>
              <div>
                <h4 className="font-serif text-lg tracking-wider text-white">Coordenadas</h4>
                <p className="font-sans text-xs text-white/50 uppercase tracking-widest mt-1">39° 59' N, 7° 13' W</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full flex-col sm:flex-row">
            <Link to="/onde-estamos" className="w-full sm:w-auto">
              <button className="group relative w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-transparent border border-white/20 text-white/90 font-sans text-sm tracking-[0.2em] uppercase overflow-hidden transition-all hover:bg-white/5 hover:border-[#d4b098]/50">
                <span>Descobrir a Região</span>
                <ArrowRight strokeWidth={1} className="w-4 h-4 group-hover:text-[#d4b098] transition-colors" />
                <div className="absolute inset-0 border border-[#d4b098]/0 group-hover:border-[#d4b098]/30 transition-colors duration-500 scale-105 group-hover:scale-100 pointer-events-none" />
              </button>
            </Link>
            <button className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-transparent border border-transparent text-white/50 font-sans text-sm tracking-[0.2em] uppercase overflow-hidden transition-all hover:text-white/90 w-full sm:w-auto">
              <span>Obter Direções</span>
              <Navigation strokeWidth={1} className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Right Visual */}
        <motion.div 
          className="lg:col-span-7 relative h-[500px] lg:h-[700px] w-full mt-12 lg:mt-0"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.2, margin: "-50px" }}
        >
          <div className="absolute inset-0 group">
            {/* Corner accents */}
            <div className="absolute -top-4 -left-4 w-16 h-16 border-t border-l border-white/20 z-20 transition-all duration-700 group-hover:border-[#d4b098] pointer-events-none" />
            <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b border-r border-white/20 z-20 transition-all duration-700 group-hover:border-[#d4b098] pointer-events-none" />

            <div className="absolute inset-0 border border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/10 transition-colors duration-1000 pointer-events-none" />
              <img 
                src="/src/assets/images/epic_rural_landscape_1785291454883.jpg" 
                alt="Paisagem do Ladoeiro" 
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[4s] ease-out mix-blend-luminosity group-hover:mix-blend-normal"
              />
              
              {/* Floating Map Pin on Image */}
              <motion.div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                viewport={{ once: false }}
              >
                <div className="relative cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-110">
                    <MapPin strokeWidth={1} className="w-6 h-6 text-[#d4b098]" />
                  </div>
                  {/* Ripple effects */}
                  <div className="absolute inset-0 rounded-full border border-[#d4b098] animate-ping [animation-duration:3s] opacity-50" />
                  <div className="absolute inset-0 rounded-full border border-[#d4b098] animate-ping [animation-duration:3s] opacity-30" style={{ animationDelay: '1.5s' }} />
                </div>
              </motion.div>
              
              {/* Image caption */}
              <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
                 <p className="font-sans text-[10px] text-white/50 uppercase tracking-[0.3em]">Beira Baixa, Portugal</p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
