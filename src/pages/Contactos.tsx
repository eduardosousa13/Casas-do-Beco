import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Mail, Phone, MapPin, Compass, ArrowRight, Check, Send, HelpCircle, ChevronRight, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import ReservationModal from '../components/ReservationModal';

export default function Contactos() {
  const [loading, setLoading] = useState(true);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Contact Form State
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    casa: 'outra',
    mensagem: ''
  });
  
  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, website }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Não foi possível enviar a mensagem. Tenta novamente mais tarde.');
      }
      setFormSubmitted(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem. Tenta novamente mais tarde.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const menuItems = [
    { label: 'Início', path: '/' },
    { label: 'Onde Estamos', path: '/onde-estamos' },
    { label: 'Sobre Nós', path: '/sobre-nos' },
    { label: 'Contactos', path: '/contactos' }
  ];

  const faqs = [
    {
      q: "Quais os horários de Check-in e Check-out?",
      a: "O nosso Check-in realiza-se a partir das 16:00 até às 21:00. O Check-out deve ser efetuado até às 11:00. Caso necessite de horários especiais flexíveis, fale connosco previamente."
    },
    {
      q: "A estadia inclui pequeno-almoço?",
      a: "Não servimos pequeno-almoço buffet, mas mimamos os nossos hóspedes com um generoso cesto de boas-vindas repleto de iguarias locais: pão fresco beirão, queijo regional, compotas artesanais, mel do Ladoeiro, fruta da época e o nosso azeite virgem autêntico."
    },
    {
      q: "As Casas do Beco aceitam animais de estimação?",
      a: "Para garantir o máximo conforto e isolamento acústico de todos os nossos hóspedes, a aceitação de animais de estimação está sujeita a consulta e autorização prévia por escrito."
    },
    {
      q: "Existe estacionamento privativo disponível?",
      a: "Sim, os hóspedes dispõem de estacionamento público gratuito mesmo à porta das moradias, num local calmo, seguro e de facílimo acesso na nossa rua típica do Beco."
    }
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
              <span className="font-sans text-[9px] tracking-[0.3em] text-[#d4b098] uppercase">Sossego e Diálogo</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />

      {/* 2. Symmetrical Luxury Navigation Header */}
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
                  <Link key={item} to="/sobre-nos" className="text-white/80 hover:text-[#d4b098] font-sans text-[10px] tracking-widest uppercase transition-colors">
                    {item}
                  </Link>
                );
              } else {
                return (
                  <Link key={item} to="/contactos" className="text-[#d4b098] hover:text-[#d4b098] font-sans text-[10px] tracking-widest uppercase transition-colors font-semibold">
                    {item}
                  </Link>
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
                    item.path === '/contactos' ? 'text-[#d4b098]' : 'text-white'
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

      {/* 3. Immersive Hero Cover Header */}
      <div ref={heroRef} className="relative h-[85vh] md:h-[90vh] w-full flex items-center justify-center overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y: heroBgY, scale: heroScale }}
        >
          <img 
            src="/src/assets/images/ladoeiro_streets_1785294645315.jpg" 
            alt="Ruas do Ladoeiro" 
            className="w-full h-full object-cover opacity-25" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0604] via-transparent to-[#0a0604]/50" />
        </motion.div>

        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center max-w-4xl px-6 space-y-6 pt-16"
        >
          <span className="text-[#d4b098] font-sans tracking-[0.3em] uppercase text-[9px] md:text-xs font-semibold block">Início do Diálogo</span>
          <h1 className="text-white font-serif text-4xl md:text-6xl lg:text-7xl font-light leading-tight drop-shadow-lg">
            Onde o Silêncio<br />se Faz <span className="italic font-serif text-[#d4b098]">Acolhimento</span>
          </h1>
          <p className="text-stone-300 font-sans text-xs md:text-sm font-light max-w-xl mx-auto leading-relaxed">
            Tem alguma dúvida, deseja planear uma estadia personalizada ou quer saber mais sobre a nossa região? Fale connosco. A nossa família está pronta para o escutar.
          </p>
          <div className="pt-8 flex flex-col items-center justify-center">
            <span className="text-white/40 font-sans text-[8px] tracking-[0.25em] uppercase mb-4 block">Formulário e Contactos</span>
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

      {/* 4. Contact Grid Section (Bidirectional scroll animation) */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24 space-y-24 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Left Column: Direct channels and FAQs */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="lg:col-span-5 space-y-12"
          >
            <div className="space-y-4">
              <span className="text-[#d4b098] font-sans text-[9px] tracking-[0.25em] uppercase font-semibold block">Canais Diretos</span>
              <h2 className="text-white font-serif text-3xl md:text-4xl font-light">Ligue-se ao Sossego</h2>
              <div className="w-12 h-[1px] bg-[#d4b098]/30" />
              <p className="text-stone-400 font-sans text-xs font-light leading-relaxed">
                Estamos disponíveis para responder a chamadas telefónicas ou responder aos seus emails com a máxima atenção e detalhe.
              </p>
            </div>

            {/* Channels Card List */}
            <div className="space-y-4">
              {/* Phone */}
              <a
                href="tel:+351900000000"
                className="flex items-center gap-5 p-5 border border-white/5 bg-white/[0.01] hover:border-[#d4b098]/30 hover:bg-white/[0.03] transition-all group"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#d4b098] bg-black/60 group-hover:bg-[#d4b098] group-hover:text-black transition-all">
                  <Phone size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-serif text-base text-white font-light">Telefone e WhatsApp</h4>
                  <p className="font-sans text-xs text-stone-400 mt-1 hover:text-[#d4b098] transition-colors">+351 900 000 000</p>
                </div>
              </a>

              {/* Email */}
              <a 
                href="mailto:casasdobecoladoeiro@gmail.com"
                className="flex items-center gap-5 p-5 border border-white/5 bg-white/[0.01] hover:border-[#d4b098]/30 hover:bg-white/[0.03] transition-all group"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#d4b098] bg-black/60 group-hover:bg-[#d4b098] group-hover:text-black transition-all">
                  <Mail size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-serif text-base text-white font-light">Correio Eletrónico</h4>
                  <p className="font-sans text-xs text-stone-400 mt-1 hover:text-[#d4b098] transition-colors">casasdobecoladoeiro@gmail.com</p>
                </div>
              </a>

              {/* Location */}
              <div 
                className="flex items-center gap-5 p-5 border border-white/5 bg-white/[0.01] hover:border-[#d4b098]/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#d4b098] bg-black/60">
                  <MapPin size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-serif text-base text-white font-light">Localização Física</h4>
                  <p className="font-sans text-xs text-stone-400 mt-1">Rua do Beco, Ladoeiro • Beira Baixa, Portugal</p>
                </div>
              </div>
            </div>

            {/* FAQs Accordion */}
            <div className="space-y-6 pt-4 border-t border-white/5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#d4b098]">
                  <HelpCircle size={14} />
                  <span className="font-sans text-[9px] tracking-widest uppercase font-semibold">Respostas Rápidas</span>
                </div>
                <h3 className="text-white font-serif text-xl font-light">Perguntas Frequentes</h3>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div 
                    key={idx} 
                    className="border border-white/5 bg-black/30 overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full p-4 text-left flex justify-between items-center gap-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="font-serif text-sm text-stone-200 font-light">{faq.q}</span>
                      <ChevronRight 
                        size={14} 
                        className={`text-[#d4b098] transition-transform duration-300 ${
                          activeFaq === idx ? 'rotate-90' : ''
                        }`} 
                      />
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {activeFaq === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="p-4 pt-0 border-t border-white/5 text-stone-400 font-sans text-xs font-light leading-relaxed">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Contact Form with luxury feedback */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ type: "spring", stiffness: 60, damping: 20, delay: 0.15 }}
            className="lg:col-span-7 bg-[#0d0907] border border-white/5 p-8 md:p-12 relative flex flex-col justify-between"
          >
            {/* Subtle background card accents */}
            <div className="absolute top-4 left-4 w-3 h-3 border-t border-l border-[#d4b098]/40" />
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-[#d4b098]/40" />
            
            <AnimatePresence mode="wait">
              {!formSubmitted ? (
                <motion.form 
                  key="contact-form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleFormSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <span className="text-[#d4b098] font-sans text-[8px] tracking-[0.3em] uppercase block">Correspondência</span>
                    <h3 className="font-serif text-2xl font-light text-white">Escreva a Sua Mensagem</h3>
                    <p className="text-stone-500 font-sans text-xs font-light leading-relaxed">
                      Preencha o formulário abaixo e responderemos assim que possível.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="font-sans text-[10px] uppercase tracking-wider text-stone-400 block">Nome Completo *</label>
                      <input 
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required
                        placeholder="Ex: Maria Santos"
                        className="w-full bg-[#140f0c] border border-white/10 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#d4b098]/50 transition-colors"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="font-sans text-[10px] uppercase tracking-wider text-stone-400 block">Correio Eletrónico *</label>
                      <input 
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Ex: maria@email.com"
                        className="w-full bg-[#140f0c] border border-white/10 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#d4b098]/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Phone */}
                    <div className="space-y-2">
                      <label className="font-sans text-[10px] uppercase tracking-wider text-stone-400 block">Telefone / Telemóvel</label>
                      <input 
                        type="tel"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        placeholder="Ex: +351 900 000 000"
                        className="w-full bg-[#140f0c] border border-white/10 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#d4b098]/50 transition-colors"
                      />
                    </div>

                    {/* Preferred House choice */}
                    <div className="space-y-2">
                      <label className="font-sans text-[10px] uppercase tracking-wider text-stone-400 block">Assunto / Casa Preferida</label>
                      <select 
                        name="casa"
                        value={formData.casa}
                        onChange={handleInputChange}
                        className="w-full bg-[#140f0c] border border-white/10 px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-[#d4b098]/50 transition-colors appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d4b098'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                      >
                        <option value="nascente" className="bg-[#140f0c]">Casa Nascente (T4)</option>
                        <option value="poente" className="bg-[#140f0c]">Casa Poente (T1)</option>
                        <option value="geral" className="bg-[#140f0c]">Dúvida Geral</option>
                        <option value="outra" className="bg-[#140f0c]">Outro Assunto</option>
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="font-sans text-[10px] uppercase tracking-wider text-stone-400 block">A sua Mensagem *</label>
                    <textarea 
                      name="mensagem"
                      value={formData.mensagem}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      placeholder="Escreva aqui a sua mensagem ou as datas pretendidas..."
                      className="w-full bg-[#140f0c] border border-white/10 p-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#d4b098]/50 transition-colors resize-none"
                    />
                  </div>

                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input id="contact-website" name="website" type="text" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>

                  {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full py-4 bg-[#d4b098] hover:bg-white text-black font-sans text-xs tracking-[0.25em] uppercase font-bold transition-colors flex items-center justify-center gap-3 cursor-pointer group shadow-lg disabled:opacity-60 disabled:cursor-wait"
                  >
                    <span>{formSubmitting ? 'A enviar...' : 'Enviar Mensagem'}</span>
                    <Send size={12} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="form-success"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center text-center py-16 space-y-6"
                >
                  <div className="w-16 h-16 rounded-full border border-[#d4b098]/30 flex items-center justify-center bg-[#d4b098]/10 text-[#d4b098]">
                    <Check size={28} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl text-white font-light">Mensagem Enviada!</h3>
                    <p className="text-stone-400 font-sans text-sm font-light max-w-sm leading-relaxed mx-auto">
                      Agradecemos o seu contacto, <span className="text-[#d4b098] font-medium">{formData.nome}</span>. A sua mensagem foi enviada e responderemos assim que possível.
                    </p>
                  </div>
                  <div className="w-12 h-[1px] bg-[#d4b098]/30" />
                  <button 
                    onClick={() => {
                      setFormSubmitted(false);
                      setFormError(null);
                      setWebsite('');
                      setFormData({ nome: '', email: '', telefone: '', casa: 'outra', mensagem: '' });
                    }}
                    className="text-stone-500 hover:text-white transition-colors font-sans text-[10px] tracking-widest uppercase border-b border-stone-800 hover:border-white pb-1 pt-2"
                  >
                    Enviar Outra Mensagem
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
        </div>

        {/* 5. Styled Map Directions Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          className="border border-white/5 bg-[#0d0907] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#d4b098] blur-[150px] opacity-5 pointer-events-none" />
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2 text-[#d4b098]">
              <Compass size={14} className="animate-spin-slow" />
              <span className="font-sans text-[9px] tracking-widest uppercase font-semibold">Idanha-a-Nova</span>
            </div>
            <h2 className="text-white font-serif text-2xl md:text-3xl font-light">Como Chegar às Casas do Beco?</h2>
            <p className="text-stone-400 font-sans text-xs md:text-sm font-light leading-relaxed">
              As casas localizam-se na pacata vila de Ladoeiro, a cerca de 20 minutos de Castelo Branco. As coordenadas GPS precisas de acesso são <span className="text-white font-medium">39° 59' N, 7° 13' W</span>. Ao entrar no Ladoeiro, siga as indicações para a Capela de Santa Catarina, as moradias situam-se na acolhedora Rua do Beco.
            </p>
          </div>
          
          <a 
            href="https://maps.google.com/?q=Ladoeiro,+Idanha-a-Nova,+Portugal" 
            target="_blank" 
            referrerPolicy="no-referrer"
            className="w-full md:w-auto py-4 px-8 border border-white/20 text-white font-sans text-[10px] tracking-widest uppercase hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 group shrink-0"
          >
            <span>Google Maps</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>

      </div>

      <Footer />
    </div>
  );
}
