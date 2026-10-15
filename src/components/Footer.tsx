import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0604] border-t border-white/5 pt-20 pb-8 px-6 md:px-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[100px] bg-[#d4b098] blur-[100px] md:blur-[150px] opacity-10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 mb-16 relative z-10">
        
        {/* Brand / Logo Area */}
        <div className="flex flex-col gap-6 md:w-1/3">
           <img 
             src="/src/assets/images/logo.png" 
             alt="Logo Ladoeiro" 
             className="w-32 md:w-40 h-auto invert brightness-0 opacity-90 drop-shadow-lg"
           />
           <p className="text-white/50 font-sans font-light text-sm leading-relaxed max-w-sm">
             Um refúgio de tranquilidade no coração da natureza. A fusão perfeita entre a rusticidade e o requinte num ambiente profundamente acolhedor.
           </p>
        </div>

        {/* Contacts */}
        <div className="flex flex-col gap-6 md:w-1/3">
          <h4 className="text-white/90 font-serif text-lg tracking-wide">Contactos</h4>
          <div className="flex flex-col gap-4">
            <a href="#" className="flex items-center gap-4 text-white/50 hover:text-[#d4b098] transition-colors duration-300 font-light text-sm w-fit group">
              <span className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#d4b098]/30 transition-colors">
                <Phone size={14} />
              </span>
              <span>+351 900 000 000</span>
            </a>
            <a href="mailto:casasdobecoladoeiro@gmail.com" className="flex items-center gap-4 text-white/50 hover:text-[#d4b098] transition-colors duration-300 font-light text-sm w-fit group">
              <span className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#d4b098]/30 transition-colors">
                <Mail size={14} />
              </span>
              <span>casasdobecoladoeiro@gmail.com</span>
            </a>
            <div className="flex items-start gap-4 text-white/50 font-light text-sm group">
              <span className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0">
                <MapPin size={14} />
              </span>
              <span className="mt-1.5">Ladoeiro, Beira Baixa<br/>Portugal</span>
            </div>
          </div>
        </div>

        {/* Socials */}
        <div className="flex flex-col gap-6 md:w-1/3 md:items-end">
          <h4 className="text-white/90 font-serif text-lg tracking-wide md:text-right w-full">Siga-nos</h4>
          <div className="flex gap-4">
            <a href="#" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-black hover:bg-white hover:border-white hover:scale-105 transition-all duration-300 shadow-lg">
              <Facebook size={20} />
            </a>
            <a href="#" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-black hover:bg-white hover:border-white hover:scale-105 transition-all duration-300 shadow-lg">
              <Instagram size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <p className="text-white/30 font-light text-xs">
          © {currentYear} Casas do Ladoeiro. Todos os direitos reservados.
        </p>
        <div className="flex gap-6 text-white/30 font-light text-xs tracking-wider">
          <a href="#" className="hover:text-white/70 transition-colors duration-300">TERMOS & CONDIÇÕES</a>
          <a href="#" className="hover:text-white/70 transition-colors duration-300">POLÍTICA DE PRIVACIDADE</a>
        </div>
      </div>
    </footer>
  );
}
