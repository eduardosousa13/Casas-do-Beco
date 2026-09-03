import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Houses() {
  return (
    <section className="relative w-full h-screen min-h-[600px] flex flex-col md:flex-row bg-[#0a0604] overflow-hidden">
      
      {/* Left House */}
      <motion.div 
        className="relative w-full md:w-1/2 h-1/2 md:h-full group cursor-pointer overflow-hidden"
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: false, amount: 0.2 }}
      >
        <div className="absolute inset-0 bg-black z-0" />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 group-hover:opacity-90 transform group-hover:scale-105 transition-all duration-[2s] ease-out z-10 mix-blend-luminosity group-hover:mix-blend-normal"
          style={{ backgroundImage: "url('/src/assets/images/village_house_1_1785331307550.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none" />
        
        {/* Absolute Clickable Link Overlay */}
        <Link to="/casas/nascente" className="absolute inset-0 z-25 cursor-pointer" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-30 pointer-events-none">
          <motion.div 
            className="flex items-end justify-between w-full"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            viewport={{ once: false }}
          >
            <div>
              <p className="text-white/60 font-sans text-xs tracking-[0.3em] uppercase mb-3">Refúgio</p>
              <h3 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white tracking-wide">Casa Nascente</h3>
            </div>
            
            <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 group-hover:border-white transform md:translate-x-[-20px] md:group-hover:translate-x-0 translate-x-0 transition-all duration-500">
              <ArrowRight strokeWidth={1} className="text-white w-6 h-6" />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right House */}
      <motion.div 
        className="relative w-full md:w-1/2 h-1/2 md:h-full group cursor-pointer overflow-hidden border-t md:border-t-0 md:border-l border-white/10"
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: false, amount: 0.2 }}
      >
        <div className="absolute inset-0 bg-black z-0" />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 group-hover:opacity-90 transform group-hover:scale-105 transition-all duration-[2s] ease-out z-10 mix-blend-luminosity group-hover:mix-blend-normal"
          style={{ backgroundImage: "url('/src/assets/images/village_house_2_1785331327631.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none" />
        
        {/* Absolute Clickable Link Overlay */}
        <Link to="/casas/poente" className="absolute inset-0 z-25 cursor-pointer" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-30 pointer-events-none">
          <motion.div 
            className="flex items-end justify-between w-full"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            viewport={{ once: false }}
          >
            <div>
              <p className="text-white/60 font-sans text-xs tracking-[0.3em] uppercase mb-3">Conforto</p>
              <h3 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white tracking-wide">Casa Poente</h3>
            </div>
            
            <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 group-hover:border-white transform md:translate-x-[-20px] md:group-hover:translate-x-0 translate-x-0 transition-all duration-500">
              <ArrowRight strokeWidth={1} className="text-white w-6 h-6" />
            </div>
          </motion.div>
        </div>
      </motion.div>

    </section>
  );
}
