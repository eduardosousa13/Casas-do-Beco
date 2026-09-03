import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { ChevronDown, Heart, ArrowRight, ArrowLeft, Landmark, Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import ReservationModal from '../components/ReservationModal';

export default function SobreNos() {
  const [loading, setLoading] = useState(true);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll animations for Hero
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroBgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  useEffect(() => {
    // Scroll to top immediately on mount
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const menuItems = [
    { label: 'Início', path: '/' },
    { label: 'Onde Estamos', path: '/onde-estamos' },
    { label: 'Sobre Nós', path: '/sobre-nos' }
  ];

  return (
    <div ref={containerRef} className="w-full bg-[#0a0604] text-white selection:bg-[#d4b098] selection:text-[#0a0604] overflow-x-hidden">
      {/* 1. Loading screen */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0604]"
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
                onError={() => setLogoError(true)}
              />
              <div className="h-[1px] w-16 bg-[#d4b098]/30 relative overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-[#d4b098] w-1/2"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
              <span className="font-sans text-[9px] tracking-[0.3em] text-[#d4b098] uppercase">História e Alma</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />

      {/* 2. Floating Luxury Navigation Header */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 md:px-12 ${
        scrolled 
          ? 'py-4 bg-[#0a0604]/90 backdrop-blur-md border-b border-white/5 shadow-lg' 
          : 'py-8 bg-transparent border-b border-transparent'
      }`}>
        {/* Desktop Header Layout */}
        <div className="hidden md:flex items-center justify-between w-full max-w-7xl mx-auto">
          {/* Left Navigation */}
          <div className="flex space-x-8 flex-1">
            {['Sobre Nós', 'Onde Estamos', 'Contactos'].map((item) => {
              if (item === 'Onde Estamos') {
                return (
                  <Link key={item} to="/onde-estamos" className="text-white/80 hover:text-[#d4b098] font-sans text-[10px] tracking-widest uppercase transition-colors">
                    {item}
                  </Link>
                );
              } else if (item === 'Sobre Nós') {
                return (
                  <Link key={item} to="/sobre-nos" className="text-[#d4b098] hover:text-[#d4b098] font-sans text-[10px] tracking-widest uppercase transition-colors font-semibold">
                    {item}
                  </Link>
                );
              } else {
                return (
                  <a key={item} href="#footer" onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth' });
                  }} className="text-white/80 hover:text-[#d4b098] font-sans text-[10px] tracking-widest uppercase transition-colors">
                    {item}
                  </a>
                );
              }
            })}
          </div>

          {/* Center Logo */}
          <div className="flex justify-center flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img 
                src="/src/assets/images/logo.png" 
                alt="Casas do Beco" 
                className="h-6 lg:h-7 w-auto invert brightness-0 hover:opacity-80 transition-opacity" 
                onError={() => setLogoError(true)} 
              />
            </Link>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center justify-end space-x-8 flex-1">
            <div className="flex items-center space-x-3 text-white/80 font-sans text-[10px] tracking-widest uppercase">
              <button className="hover:text-white transition-colors text-white font-semibold">PT</button>
              <span className="text-white/30">|</span>
              <button className="hover:text-white transition-colors">EN</button>
            </div>
            
            <button 
              onClick={() => setIsReservationOpen(true)}
              className="text-white hover:text-black font-sans text-[10px] tracking-widest uppercase transition-colors border border-[#d4b098]/30 hover:border-white hover:bg-white px-6 py-2.5 backdrop-blur-sm cursor-pointer"
            >
              Reservas
            </button>
          </div>
        </div>

        {/* Mobile Header Layout */}
        <div className="flex md:hidden items-center justify-between w-full">
          <Link to="/" className="flex items-center">
            <img 
              src="/src/assets/images/logo.png" 
              alt="Casas do Beco" 
              className="h-5 w-auto invert brightness-0" 
              onError={() => setLogoError(true)} 
            />
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
              className="text-white/80 hover:text-white font-sans text-[10px] tracking-widest uppercase focus:outline-none"
            >
              Menu
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 bg-[#0a0604] flex flex-col justify-center items-center p-8 pt-24"
          >
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-5 right-6 text-white/70 hover:text-white p-2 font-sans text-xs tracking-widest uppercase"
            >
              Fechar
            </button>
            <div className="flex flex-col items-center gap-8 text-center">
              {menuItems.map((item) => (
                <Link 
                  key={item.label}
                  to={item.path} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`font-serif text-3xl hover:text-[#d4b098] transition-colors ${
                    item.path === '/sobre-nos' ? 'text-[#d4b098]' : 'text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
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

      {/* 3. Cinematic Hero Header */}
      <div ref={heroRef} className="relative h-[90vh] md:h-screen w-full flex items-center justify-center overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y: heroBgY, scale: heroScale }}
        >
          <img 
            src="/src/assets/images/luxury_painted_ladoeiro_1785292070951.jpg" 
            alt="Casas do Beco" 
            className="w-full h-full object-cover opacity-30" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0604] via-transparent to-[#0a0604]/60" />
        </motion.div>

        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center max-w-4xl px-6 space-y-6 pt-16"
        >
          <span className="text-[#d4b098] font-sans tracking-[0.3em] uppercase text-[9px] md:text-xs font-semibold block">A Alma por Trás do Projeto</span>
          <h1 className="text-white font-serif text-4xl md:text-6xl lg:text-7xl font-light leading-tight drop-shadow-lg">
            Um Sonho Esculpido<br />em <span className="italic font-serif text-[#d4b098]">Pedra & Coração</span>
          </h1>
          <p className="text-stone-300 font-sans text-xs md:text-sm font-light max-w-xl mx-auto leading-relaxed">
            As Casas do Beco nasceram do desejo de resgatar o legado arquitetónico da Beira Baixa, fundindo o sossego da vida rural com o mais requintado luxo contemporâneo.
          </p>
          <div className="pt-8 flex flex-col items-center justify-center">
            <span className="text-white/40 font-sans text-[8px] tracking-[0.25em] uppercase mb-4 block">Descubra a nossa história</span>
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-[#d4b098]/70"
            >
              <ChevronDown size={24} strokeWidth={1} />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* 4. Narrative Sections with Scroll Reveal */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-32 space-y-24 md:space-y-48 relative z-10">
        
        {/* Section 1: A Origem e o Legado */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-10% 0px" }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="space-y-3">
              <span className="text-[#d4b098] font-sans text-[9px] tracking-[0.25em] uppercase font-semibold block">O Recomeço</span>
              <h2 className="text-white font-serif text-3xl md:text-4xl lg:text-5xl font-light leading-tight">Onde o Tempo Esculpe Memórias</h2>
            </div>
            <div className="w-12 h-[1px] bg-[#d4b098]/30" />
            <p className="text-stone-400 font-sans text-xs md:text-sm font-light leading-relaxed">
              O Ladoeiro sempre foi uma terra de horizontes generosos e gentes generosas. No centro desta vila albicastrense, duas moradias de traça rústica, feitas em pedra robusta e banhadas pelo sol quente da planície, guardavam o eco de tempos antigos.
            </p>
            <p className="text-stone-400 font-sans text-xs md:text-sm font-light leading-relaxed">
              Foi no seio destas paredes ancestrais que vislumbrámos a oportunidade de erguer um refúgio de luxo. A nossa missão não era apenas reconstruir, mas sim honrar o carácter imponente da pedra e dotá-la de uma alma moderna, acolhedora e sumptuosa.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, margin: "-10% 0px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="lg:col-span-7 relative aspect-[4/3] w-full border border-white/10 overflow-hidden"
          >
            <img 
              src="/src/assets/images/ladoeiro_streets_1785294645315.jpg" 
              alt="Ladoeiro Origem" 
              className="w-full h-full object-cover opacity-80 hover:scale-105 transition-all duration-1000" 
            />
            {/* Corner border details */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#d4b098]" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-[#d4b098]" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[#d4b098]" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[#d4b098]" />
          </motion.div>
        </div>

        {/* Section 2: O Restauro Consciente (Earthy light backdrop for editorial design contrast) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, margin: "-10% 0px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="lg:col-span-7 lg:order-2 relative aspect-[4/3] w-full border border-white/10 overflow-hidden"
          >
            <img 
              src="/src/assets/images/village_house_1_1785331307550.jpg" 
              alt="O Restauro da Pedra" 
              className="w-full h-full object-cover opacity-80 hover:scale-105 transition-all duration-1000" 
            />
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#d4b098]" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-[#d4b098]" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[#d4b098]" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[#d4b098]" />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-10% 0px" }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="lg:col-span-5 lg:order-1 space-y-6"
          >
            <div className="space-y-3">
              <span className="text-[#d4b098] font-sans text-[9px] tracking-[0.25em] uppercase font-semibold block">A Arquitetura</span>
              <h2 className="text-white font-serif text-3xl md:text-4xl lg:text-5xl font-light leading-tight">Arquitetura de Preservação</h2>
            </div>
            <div className="w-12 h-[1px] bg-[#d4b098]/30" />
            <p className="text-stone-400 font-sans text-xs md:text-sm font-light leading-relaxed">
              O projeto das Casas do Beco foi desenhado com um compromisso absoluto de sustentabilidade e conservação. Cada bloco de granito rústico original foi limpo e mantido para testemunhar a herança local, servindo de isolamento natural extraordinário.
            </p>
            <p className="text-stone-400 font-sans text-xs md:text-sm font-light leading-relaxed">
              No interior, combinámos madeiras macias de pinho, revestimentos nobres e isolamento de cortiça biológica nacional. Esta simbiose garante um conforto acústico e térmico incomparável, criando um ambiente de casulo perfeito para noites de descanso inigualáveis.
            </p>
          </motion.div>
        </div>

        {/* 5. Typographic Manifesto block */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 1 }}
          className="bg-[#0f0b09] border border-white/5 py-16 px-8 md:p-20 text-center max-w-5xl mx-auto space-y-6 relative"
        >
          {/* Subtle logo bg mark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
            <span className="font-serif text-9xl tracking-[0.25em]">BECO</span>
          </div>
          <Heart size={24} strokeWidth={1} className="text-[#d4b098] mx-auto opacity-70" />
          <h3 className="font-serif text-2xl md:text-4xl font-light text-white italic max-w-3xl mx-auto leading-relaxed">
            "Não oferecemos apenas uma dormida, mas sim um espaço sagrado onde o luxo moderno se curva perante a simplicidade e a calma ancestral da Beira Baixa."
          </h3>
          <span className="text-[#d4b098] font-sans text-[10px] tracking-[0.2em] uppercase block font-semibold pt-4">— O MANIFESTO DAS CASAS DO BECO</span>
        </motion.div>

        {/* Section 3: As Três Linhas do Nosso Serviço */}
        <div className="space-y-16 pt-8">
          <div className="text-center space-y-4">
            <span className="text-[#d4b098] font-sans text-[9px] tracking-[0.25em] uppercase font-semibold block">Pilares</span>
            <h2 className="text-white font-serif text-3xl md:text-4xl font-light">O Que Nos Define</h2>
            <div className="w-12 h-[1px] bg-[#d4b098]/30 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            {/* Pillar 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ delay: 0.1 }}
              className="border border-white/5 p-8 bg-black/40 space-y-4 hover:border-[#d4b098]/30 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[#d4b098] group-hover:bg-[#d4b098] group-hover:text-black transition-all">
                <Landmark size={18} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl font-light text-white">Património Vivo</h3>
              <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
                Cada recanto, ombreira e pedra rústica foi integrada no restauro de forma cuidada, mantendo viva a traça arquitetónica clássica de Ladoeiro.
              </p>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ delay: 0.2 }}
              className="border border-white/5 p-8 bg-black/40 space-y-4 hover:border-[#d4b098]/30 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[#d4b098] group-hover:bg-[#d4b098] group-hover:text-black transition-all">
                <Award size={18} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl font-light text-white">Luxo Intuitivo</h3>
              <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
                Mobiliário de design contemporâneo, ar condicionado invisível, isolamento acústico supremo e enxoval de linho puro português.
              </p>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ delay: 0.3 }}
              className="border border-white/5 p-8 bg-black/40 space-y-4 hover:border-[#d4b098]/30 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[#d4b098] group-hover:bg-[#d4b098] group-hover:text-black transition-all">
                <Heart size={18} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl font-light text-white">Acolhimento Íntimo</h3>
              <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
                Mimamos os nossos hóspedes com um cesto de boas-vindas repleto de iguarias artesanais locais, fruta da época e o azeite autêntico da Beira.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Section 4: A Mensagem dos Fundadores */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center pt-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 1 }}
            className="lg:col-span-5 relative aspect-square md:aspect-[4/5] w-full border border-white/10 overflow-hidden"
          >
            <img 
              src="/src/assets/images/village_house_2_1785331327631.jpg" 
              alt="Casa Poente Exterior" 
              className="w-full h-full object-cover opacity-75" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0604] via-[#0a0604]/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-left">
              <span className="text-[#d4b098] font-sans text-[8px] tracking-widest uppercase block mb-1">Entrada Principal</span>
              <p className="text-white font-serif text-sm italic font-light">Casas do Beco • Poente e Nascente</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="space-y-3">
              <span className="text-[#d4b098] font-sans text-[9px] tracking-[0.25em] uppercase font-semibold block">Uma Mensagem Pessoal</span>
              <h2 className="text-white font-serif text-3xl md:text-4xl font-light">Seja Bem-vindo à Nossa Casa</h2>
            </div>
            <div className="w-12 h-[1px] bg-[#d4b098]/30" />
            
            <div className="space-y-4 font-serif text-stone-300 font-light text-sm italic leading-relaxed">
              <p>
                "As Casas do Beco começaram como um sonho numa tarde de outono, enquanto contemplávamos a beleza crua e imutável das planícies do Ladoeiro. Sabíamos que tínhamos de partilhar este sossego divino com quem precisa de desacelerar."
              </p>
              <p>
                "Fizemos questão de desenhar cada recanto das casas nós mesmos — desde a escolha da iluminação indireta quente ao conforto soberbo das camas, até ao mel e queijo artesanal beirão que o esperam no seu cesto de boas-vindas."
              </p>
              <p>
                "Esperamos de coração que encontre aqui não apenas uma estadia luxuosa, mas um refúgio profundo onde a sua alma se possa revigorar, embalada pelo murmúrio do vento nas planícies."
              </p>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <div className="h-[1px] w-8 bg-[#d4b098]/30" />
              <div>
                <span className="text-white font-serif text-sm tracking-wide block">A Família Casas do Beco</span>
                <span className="text-stone-500 font-sans text-[10px] tracking-wider uppercase block">Ladoeiro, Portugal</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 6. Dynamic Booking Box CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          className="border border-[#d4b098]/20 bg-gradient-to-br from-[#0c0806] to-[#120d0a] p-12 md:p-20 text-center space-y-8 flex flex-col items-center"
        >
          <div className="space-y-3">
            <span className="text-[#d4b098] font-sans tracking-[0.3em] uppercase text-[9px] font-semibold">Reserve o Seu Próximo Capítulo</span>
            <h2 className="text-white font-serif text-3xl md:text-5xl font-light">Escolha a Sua Moradia Preferida</h2>
            <p className="text-stone-400 font-sans text-xs md:text-sm font-light max-w-md mx-auto leading-relaxed">
              Dispomos de dois refúgios de assinatura única. Deixe que o sossego beirão o abrace na sua próxima escapadinha.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center max-w-md">
            <Link 
              to="/casas/nascente"
              className="border border-white/20 text-white font-sans text-[10px] tracking-widest uppercase hover:bg-white hover:text-black py-4 px-8 transition-all flex items-center justify-center gap-2 group w-full sm:w-auto"
            >
              Casa Nascente • T4 <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/casas/poente"
              className="border border-white/20 text-white font-sans text-[10px] tracking-widest uppercase hover:bg-white hover:text-black py-4 px-8 transition-all flex items-center justify-center gap-2 group w-full sm:w-auto"
            >
              Casa Poente • T1 <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <button 
            onClick={() => setIsReservationOpen(true)}
            className="text-stone-400 hover:text-white transition-colors font-sans text-[10px] tracking-widest uppercase border-b border-stone-500/30 hover:border-white pb-1 pt-2 cursor-pointer"
          >
            Ver Detalhes e Comparação
          </button>
        </motion.div>

      </div>

      <Footer />
    </div>
  );
}
