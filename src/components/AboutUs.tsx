import { motion } from 'motion/react';
import { Leaf, Home, Heart, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  return (
    <section className="relative bg-[#faf9f8] text-black py-24 px-6 md:px-12 overflow-hidden border-t border-black/5">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Giant Watermark */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center opacity-[0.03] select-none flex items-center justify-center pointer-events-none">
          <span className="text-[12rem] md:text-[22rem] font-serif tracking-widest font-bold whitespace-nowrap text-black">
            LADOEIRO
          </span>
        </div>
        
        {/* Soft, warm light blooms */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-[#d4b098]/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-[#d4b098]/15 blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center">
        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.2, margin: "-50px" }}
          className="text-center max-w-3xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-serif font-light mb-6 tracking-wide drop-shadow-sm">
            A Nossa Origem
          </h2>
          <div className="w-12 h-[1px] bg-black/30 mx-auto mb-8" />
          <p className="text-black/80 font-sans font-medium tracking-wide text-base md:text-lg leading-relaxed md:leading-loose mb-8">
            Nascidos em 2026 com duas casas de aldeia, somos movidos pela paixão ao Ladoeiro. O nosso propósito é partilhar a autenticidade e a beleza intocada da vida rural com quem procura um refúgio na natureza.
          </p>
          
          <Link to="/sobre-nos" className="group relative inline-flex items-center justify-center gap-3 px-8 py-3 bg-transparent border border-black/20 text-black/90 font-sans text-sm tracking-[0.2em] uppercase overflow-hidden transition-all hover:bg-black/5 hover:border-black/40">
            <span>Saber Mais</span>
            <div className="w-4 h-[1px] bg-black/50 group-hover:w-8 group-hover:bg-black transition-all duration-300" />
          </Link>
        </motion.div>

        {/* Features / Icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl mx-auto">
          {[
            { icon: Calendar, title: "Fundação", desc: "Criada em 2026" },
            { icon: Home, title: "Alojamento", desc: "2 Casas de Aldeia" },
            { icon: Leaf, title: "Essência", desc: "Retiro na Natureza" },
            { icon: Heart, title: "Propósito", desc: "Paixão pela Terra" }
          ].map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 + (index * 0.1), ease: "easeOut" }}
              viewport={{ once: false, amount: 0.2, margin: "-50px" }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-full border border-black/10 flex items-center justify-center mb-6 bg-black/5 group-hover:bg-black/10 transition-colors duration-500">
                <item.icon strokeWidth={1} className="w-8 h-8 text-black/70 group-hover:text-black transition-colors duration-500" />
              </div>
              <h4 className="font-serif text-lg text-black mb-2 tracking-wider">{item.title}</h4>
              <p className="font-sans text-xs text-black/50 uppercase tracking-widest">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
