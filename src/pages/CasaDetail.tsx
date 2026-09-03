import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Compass, Wifi, Coffee, MapPin, 
  Tv, Sparkles, Shield, User, BedDouble, Bath, 
  Flame, Utensils, Maximize, Calendar, ArrowRight, CheckCircle2, ChevronRight 
} from 'lucide-react';
import Footer from '../components/Footer';

// Define the precise structure for our houses
interface Room {
  id: string;
  name: string;
  desc: string;
  image: string;
  x: string; // positioning on floor plan (percentage)
  y: string;
}

interface HouseData {
  id: 'nascente' | 'poente';
  title: string;
  typology: string;
  tagline: string;
  subtitle: string;
  description: string;
  heroImage: string;
  capacity: string;
  area: string;
  bedrooms: number;
  bathrooms: number;
  amenities: { icon: any; name: string }[];
  accentColor: string;
  gallery: string[];
  rooms: Room[];
}

const housesData: Record<'nascente' | 'poente', HouseData> = {
  nascente: {
    id: 'nascente',
    title: 'Casa Nascente',
    typology: 'T4 • Grande Refúgio Familiar',
    tagline: 'Onde o sol beija a tradição beirã ao amanhecer',
    subtitle: 'Uma residência senhorial de amplas dimensões, perfeita para acolher famílias ou grupos que valorizam o espaço, a sofisticação e a partilha.',
    description: 'A Casa Nascente ergue-se com imponência secular. Completamente recuperada, a sua traça de cantaria original une-se a um design de interiores requintado e contemporâneo. Composta por quatro quartos amplos (três suites), uma cozinha de autor totalmente equipada e uma majestosa sala com lareira, a casa oferece o equilíbrio sublime entre a vivência rústica e as comodidades modernas de luxo.',
    heroImage: '/src/assets/images/village_house_1_1785331307550.jpg',
    capacity: 'Até 10 Hóspedes',
    area: '240 m²',
    bedrooms: 4,
    bathrooms: 4,
    accentColor: '#d4b098',
    amenities: [
      { icon: BedDouble, name: '4 Quartos Premium' },
      { icon: Bath, name: '4 Casas de Banho' },
      { icon: Flame, name: 'Lareira de Cantaria' },
      { icon: Utensils, name: 'Cozinha Completa' },
      { icon: Wifi, name: 'Wi-Fi de Alta Velocidade' },
      { icon: Coffee, name: 'Máquina Espresso' },
      { icon: Tv, name: 'Smart TV 4K' },
      { icon: Shield, name: 'Segurança & Privacidade' },
    ],
    gallery: [
      '/src/assets/images/rural_interior_casual_1785293075431.jpg',
      '/src/assets/images/rural_interior_living_room_1785336640534.jpg',
      '/src/assets/images/rural_interior_kitchen_1785336672218.jpg',
      '/src/assets/images/rural_interior_details_1785336743460.jpg',
    ],
    rooms: [
      {
        id: 'living',
        name: 'Salão Principal',
        desc: 'Um espaço monumental com tetos altos, lareira a lenha e confortáveis sofás para tertúlias inesquecíveis.',
        image: '/src/assets/images/rural_interior_living_room_1785336640534.jpg',
        x: '25%',
        y: '30%'
      },
      {
        id: 'kitchen',
        name: 'Cozinha de Autor',
        desc: 'Completamente equipada com eletrodomésticos topo de gama, onde a pedra tradicional molda as bancadas modernas.',
        image: '/src/assets/images/rural_interior_kitchen_1785336672218.jpg',
        x: '75%',
        y: '25%'
      },
      {
        id: 'suite',
        name: 'Suite Master',
        desc: 'Quarto principal com cama king-size, tecidos orgânicos premium e casa de banho privativa em microcimento.',
        image: '/src/assets/images/rural_interior_bedroom_1785336656544.jpg',
        x: '30%',
        y: '75%'
      },
      {
        id: 'bath',
        name: 'Salas de Banho',
        desc: 'Equipadas com duches de efeito chuva e detalhes artesanais que refletem a elegância da beira.',
        image: '/src/assets/images/rural_interior_bathroom_1785336726271.jpg',
        x: '70%',
        y: '70%'
      }
    ]
  },
  poente: {
    id: 'poente',
    title: 'Casa Poente',
    typology: 'T1 • Refúgio Íntimo & Romântico',
    tagline: 'Um ninho de serenidade e calor beirão ao fim do dia',
    subtitle: 'O espaço perfeito para casais ou viajantes solitários que procuram uma comunhão pacífica com a Beira Baixa, num ambiente acolhedor e poético.',
    description: 'A Casa Poente é uma ode ao charme rústico condensado em sofisticação. Composta por uma magnífica suite com pormenores em madeira recuperada, uma acolhedora sala com lareira suspensa e uma kitchenette prática integrada de design industrial, a casa foi pensada para criar memórias de tranquilidade absoluta e proximidade. As suas portadas abrem-se diretamente para o pátio central e para o pôr do sol glorioso do Ladoeiro.',
    heroImage: '/src/assets/images/village_house_2_1785331327631.jpg',
    capacity: 'Até 3 Hóspedes',
    area: '85 m²',
    bedrooms: 1,
    bathrooms: 1,
    accentColor: '#c59b7d',
    amenities: [
      { icon: BedDouble, name: '1 Suite Romântica' },
      { icon: Bath, name: '1 Casa de Banho' },
      { icon: Flame, name: 'Salamandra/Lareira' },
      { icon: Utensils, name: 'Kitchenette Equipada' },
      { icon: Wifi, name: 'Wi-Fi de Alta Velocidade' },
      { icon: Coffee, name: 'Máquina Espresso' },
      { icon: Tv, name: 'Smart TV 4K' },
      { icon: Shield, name: 'Privacidade Total' },
    ],
    gallery: [
      '/src/assets/images/rural_interior_bedroom_1785336656544.jpg',
      '/src/assets/images/rural_interior_casual_1785293075431.jpg',
      '/src/assets/images/rural_interior_bathroom_1785336726271.jpg',
      '/src/assets/images/rural_interior_details_1785336743460.jpg',
    ],
    rooms: [
      {
        id: 'suite',
        name: 'Ninho Romântico',
        desc: 'Uma suite desenhada em tons terra, com vigas de madeira expostas e luz suave, ideal para repouso absoluto.',
        image: '/src/assets/images/rural_interior_bedroom_1785336656544.jpg',
        x: '30%',
        y: '45%'
      },
      {
        id: 'kitchenette',
        name: 'Área Social & Kitchenette',
        desc: 'Uma charmosa área integrada equipada com tudo o que necessita, banhada pela luz dourada do final de tarde.',
        image: '/src/assets/images/rural_interior_casual_1785293075431.jpg',
        x: '75%',
        y: '55%'
      }
    ]
  }
};

export default function CasaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Default to 'nascente' if invalid ID is provided
  const activeId = (id === 'poente' ? 'poente' : 'nascente') as 'nascente' | 'poente';
  const house = housesData[activeId];

  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room>(house.rooms[0]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Reservation Form State
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Force video playback when loading completes
  useEffect(() => {
    if (!loading && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Autoplay was prevented by browser, or video failed:", err);
        });
      }
    }
  }, [loading, activeId]);

  // Trigger loading screen on mount or house change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any }); // Reset scroll to the absolute top
    setLoading(true);
    setSelectedRoom(house.rooms[0]);
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800); // Elegant 1.8s load simulation

    return () => clearTimeout(timer);
  }, [activeId]);

  // Handle Switching between houses
  const handleHouseSwitch = (newId: 'nascente' | 'poente') => {
    if (newId !== activeId) {
      navigate(`/casas/${newId}`);
    }
  };

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) return;
    setFormSubmitted(true);
  };

  return (
    <div className="w-full bg-[#0a0604] text-[#2c1d11] selection:bg-[#d4b098] selection:text-[#0a0604] min-h-screen">
      
      {/* 1. BRAND LUXURY LOADING SCREEN */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d0907]"
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          >
            <div className="relative flex flex-col items-center max-w-md px-6 text-center">
              <motion.img 
                src="/src/assets/images/logo.png" 
                alt="Casas do Beco" 
                className="w-48 h-auto object-contain brightness-0 invert opacity-40 mb-8"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              
              <div className="h-[1px] w-32 bg-white/10 relative overflow-hidden mb-4">
                <motion.div 
                  className="absolute h-full bg-[#d4b098] left-0 top-0"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.4, ease: "easeInOut" }}
                />
              </div>
              
              <motion.span 
                className="text-[10px] font-sans tracking-[0.3em] uppercase text-[#d4b098]/80 block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                A carregar {house.title}...
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Navigation bar */}
      <nav className="absolute top-0 left-0 w-full z-40 px-6 md:px-12 py-8 flex justify-between items-center">
        <Link 
          to="/" 
          className="flex items-center gap-3 text-white/80 hover:text-white transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 backdrop-blur-md bg-black/20 transition-all">
            <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[10px] tracking-widest uppercase font-sans">Voltar</span>
        </Link>

        {/* Floating Brand Logo */}
        <Link to="/" className="hidden md:block">
          <img 
            src="/src/assets/images/logo.png" 
            alt="Casas do Beco" 
            className="h-10 w-auto invert brightness-0 opacity-80 hover:opacity-100 transition-opacity"
          />
        </Link>

        {/* Navigation Switcher */}
        <div className="flex gap-2 bg-black/30 border border-white/10 p-1 backdrop-blur-md">
          <button 
            onClick={() => handleHouseSwitch('nascente')}
            className={`px-4 py-2 text-[9px] tracking-widest uppercase font-sans transition-all duration-300 ${
              activeId === 'nascente' 
                ? 'bg-[#d4b098] text-[#0a0604] font-semibold' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            T4 Nascente
          </button>
          <button 
            onClick={() => handleHouseSwitch('poente')}
            className={`px-4 py-2 text-[9px] tracking-widest uppercase font-sans transition-all duration-300 ${
              activeId === 'poente' 
                ? 'bg-[#d4b098] text-[#0a0604] font-semibold' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            T1 Poente
          </button>
        </div>
      </nav>

      {/* 2. CINEMATIC SPLIT HERO SECTION */}
      <section className="relative w-full h-[85vh] md:h-screen flex flex-col justify-end overflow-hidden">
        {/* Background Zoom video */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0604] via-[#0a0604]/20 to-[#0a0604]/50 z-10" />
          <motion.video 
            key={activeId}
            ref={videoRef}
            src="/interior.webm"
            autoPlay
            loop
            muted
            playsInline
            poster={house.heroImage}
            className="w-full h-full object-cover origin-center opacity-70"
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.75 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
        </div>

        {/* Content Info */}
        <div className="relative z-20 max-w-7xl mx-auto w-full px-6 md:px-12 pb-16 md:pb-24 text-left">
          <div className="max-w-3xl space-y-6">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="px-3 py-1 border border-[#d4b098]/40 bg-black/30 backdrop-blur-sm text-[#d4b098] font-sans text-[10px] tracking-widest uppercase font-medium">
                {house.typology}
              </span>
              <div className="flex items-center gap-1.5 text-white/50 text-xs font-sans">
                <MapPin size={12} className="text-[#d4b098]" />
                <span>Ladoeiro</span>
              </div>
            </motion.div>

            <motion.h1 
              className="font-serif text-5xl md:text-7xl lg:text-8xl text-white tracking-wide leading-none"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {house.title}
            </motion.h1>

            <motion.p 
              className="text-lg md:text-xl font-serif text-[#d4b098]/90 italic leading-relaxed font-light"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              "{house.tagline}"
            </motion.p>
          </div>
        </div>

        {/* Animated bounce down button */}
        <div className="absolute bottom-6 left-0 w-full flex justify-center z-20">
          <div className="flex flex-col items-center text-white/40 font-sans tracking-widest text-[9px] uppercase gap-2">
            <span>Deslize para Explorar</span>
            <div className="w-[1px] h-12 bg-white/20 relative overflow-hidden">
              <motion.div 
                className="absolute w-full h-1/2 bg-[#d4b098] top-0 left-0"
                animate={{ y: ["0%", "200%"] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. SHARING WALL / CONNECTION INSIGHT */}
      <section className="bg-[#0a0604] py-12 border-b border-white/5 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-[#d4b098] text-[10px] tracking-widest uppercase">
            <Compass size={12} className="animate-spin-slow" />
            <span>Estrutura Geminada Beirã</span>
          </div>
          <p className="font-sans text-stone-400 font-light text-sm leading-relaxed max-w-2xl mx-auto">
            A <strong>Casa Nascente (T4)</strong> e a <strong>Casa Poente (T1)</strong> encontram-se ligadas lado a lado, partilhando um magnífico pátio beirão pavimentado a xisto e granito. Foram projetadas para operar como refúgios totalmente independentes ou como uma grande propriedade unificada capaz de acolher confortavelmente até 13 pessoas.
          </p>
        </div>
      </section>

      {/* 4. OVERVIEW & SPECS SECTION */}
      <section className="relative z-10 bg-[#0d0907] py-24 px-6 md:px-12 lg:px-20 text-[#a89a8c]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Text and Amenities Column */}
          <div className="lg:col-span-7 space-y-12 text-left">
            <div className="space-y-6">
              <span className="text-[#d4b098] font-sans tracking-[0.25em] uppercase text-xs font-semibold block">O Espaço</span>
              <h2 className="text-white font-serif text-3xl md:text-5xl font-light leading-tight">
                Design minimalista beirão construído com alma.
              </h2>
              <p className="font-sans text-stone-400 font-light text-base leading-relaxed">
                {house.subtitle}
              </p>
              <p className="font-sans text-stone-400 font-light text-base leading-relaxed">
                {house.description}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6 py-8 border-y border-white/5">
              <div className="space-y-1">
                <span className="text-stone-500 font-sans text-[10px] tracking-wider uppercase block">Área Útil</span>
                <span className="text-white font-serif text-2xl font-light">{house.area}</span>
              </div>
              <div className="space-y-1">
                <span className="text-stone-500 font-sans text-[10px] tracking-wider uppercase block">Capacidade</span>
                <span className="text-white font-serif text-2xl font-light">{house.capacity}</span>
              </div>
              <div className="space-y-1">
                <span className="text-stone-500 font-sans text-[10px] tracking-wider uppercase block">Divisões</span>
                <span className="text-white font-serif text-2xl font-light">{house.bedrooms} Quarto{house.bedrooms > 1 && 's'}</span>
              </div>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-6">
              <h4 className="text-white font-serif text-xl font-light">Comodidades Premium</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {house.amenities.map((item, index) => {
                  const IconComp = item.icon;
                  return (
                    <div key={index} className="flex items-center gap-4 p-4 border border-white/5 bg-black/25">
                      <div className="w-10 h-10 rounded-full bg-[#d4b098]/10 flex items-center justify-center text-[#d4b098]">
                        <IconComp size={18} strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-sans font-light text-white/90">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SIDEBAR: Date Booking Inquiry Widget */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="bg-[#0f0b09] border border-white/10 p-8 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.7)] text-left">
              <h3 className="text-white font-serif text-2xl font-light mb-2">Solicitar Estadia</h3>
              <p className="text-stone-500 font-sans text-xs mb-8">Consulte a disponibilidade da {house.title}.</p>

              {!formSubmitted ? (
                <form onSubmit={handleReservationSubmit} className="space-y-6">
                  {/* Check-In */}
                  <div className="space-y-2">
                    <label className="text-stone-400 font-sans text-[10px] uppercase tracking-wider block">Data de Entrada</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 text-white p-4 font-sans text-xs focus:border-[#d4b098] outline-none transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Check-Out */}
                  <div className="space-y-2">
                    <label className="text-stone-400 font-sans text-[10px] uppercase tracking-wider block">Data de Saída</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 text-white p-4 font-sans text-xs focus:border-[#d4b098] outline-none transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Guests */}
                  <div className="space-y-2">
                    <label className="text-stone-400 font-sans text-[10px] uppercase tracking-wider block">Hóspedes</label>
                    <select 
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 text-white p-4 font-sans text-xs focus:border-[#d4b098] outline-none transition-all cursor-pointer"
                    >
                      <option value="1">1 Hóspede</option>
                      <option value="2">2 Hóspedes</option>
                      <option value="3">3 Hóspedes</option>
                      {activeId === 'nascente' && (
                        <>
                          <option value="4">4 Hóspedes</option>
                          <option value="6">6 Hóspedes</option>
                          <option value="8">8 Hóspedes</option>
                          <option value="10">10 Hóspedes</option>
                        </>
                      )}
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-[#d4b098] text-[#0a0604] py-4 text-center font-sans text-[10px] tracking-widest uppercase font-semibold transition-all hover:bg-white cursor-pointer"
                  >
                    Confirmar Intenção
                  </button>
                </form>
              ) : (
                <motion.div 
                  className="space-y-6 text-center py-8"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="w-16 h-16 rounded-full bg-[#d4b098]/10 flex items-center justify-center text-[#d4b098] mx-auto">
                    <CheckCircle2 size={36} strokeWidth={1} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-white font-serif text-xl font-light">Solicitação Registada</h4>
                    <p className="text-stone-400 font-sans text-xs leading-relaxed">
                      Agradecemos o seu interesse na {house.title}. O nosso gestor irá contactá-lo nas próximas 2 horas por telefone ou e-mail para confirmar a disponibilidade.
                    </p>
                  </div>
                  <button 
                    onClick={() => setFormSubmitted(false)}
                    className="text-white border border-white/20 px-6 py-2.5 font-sans text-[10px] tracking-widest uppercase hover:bg-white hover:text-black transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                </motion.div>
              )}

              {/* Secure Booking Hint */}
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/5 text-stone-500 font-sans text-[10px]">
                <Sparkles size={12} className="text-[#d4b098]" />
                <span>Casas do Beco • Certificado Registo Oficial RNET</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE BLUEPRINT / FLOOR PLAN SIMULATOR */}
      <section className="relative z-10 bg-[#0a0604] py-24 px-6 md:px-12 border-t border-white/5 text-center">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-[#d4b098] font-sans tracking-[0.25em] uppercase text-xs font-semibold block">Exploração Guiada</span>
            <h2 className="text-white font-serif text-3xl md:text-5xl font-light">
              Planta Interativa do Refúgio
            </h2>
            <p className="text-stone-400 font-sans font-light text-sm leading-relaxed">
              Selecione as divisões da planta baixa para visualizar os seus acabamentos artesanais e detalhes arquitetónicos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
            {/* Interactive Schematic blueprint representation */}
            <div className="lg:col-span-7 bg-[#100c0a] border border-white/10 p-8 relative aspect-[4/3] rounded-sm flex items-center justify-center overflow-hidden">
              
              {/* Technical blueprint grid overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              <div className="absolute top-4 left-4 text-[9px] font-sans text-stone-500 tracking-widest uppercase">Planta de Implantação Sec. XVIII</div>
              <div className="absolute bottom-4 right-4 text-[9px] font-sans text-stone-500 tracking-widest uppercase">Casas do Beco • Escala 1:50</div>

              {/* Blueprint vector outlines mimicking a house layout */}
              <svg className="w-[80%] h-[80%] text-white/5 stroke-[1.5]" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer Wall */}
                <rect x="20" y="20" width="360" height="260" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                {/* Room dividers */}
                <line x1="200" y1="20" x2="200" y2="280" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                <line x1="20" y1="150" x2="200" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                <line x1="200" y1="180" x2="380" y2="180" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                <line x1="110" y1="20" x2="110" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                {/* Common shared courtyard door */}
                <circle cx="200" cy="150" r="15" stroke="rgba(212,176,152,0.4)" strokeDasharray="4 4" fill="transparent" />
              </svg>

              {/* Pins placed dynamically */}
              {house.rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  style={{ left: room.x, top: room.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none z-20"
                >
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                    selectedRoom.id === room.id 
                      ? 'bg-[#d4b098] scale-110 text-[#0a0604] shadow-[0_0_20px_rgba(212,176,152,0.4)]' 
                      : 'bg-[#100c0a] text-white border border-white/20 hover:border-white/50 hover:bg-black/80'
                  }`}>
                    <span className="text-xs font-sans font-medium">
                      {room.name.charAt(0)}
                    </span>
                    
                    {/* Ring animation */}
                    {selectedRoom.id === room.id && (
                      <span className="absolute inset-0 rounded-full border border-[#d4b098] animate-ping opacity-60" />
                    )}
                  </div>
                  
                  {/* Tooltip on hover */}
                  <span className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 text-white font-sans text-[9px] tracking-wider uppercase px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none shadow-md">
                    {room.name}
                  </span>
                </button>
              ))}

            </div>

            {/* Room Details Panel showing active room info */}
            <div className="lg:col-span-5">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedRoom.id}
                  className="bg-[#0f0b09] border border-white/10 p-8 space-y-6 flex flex-col justify-between min-h-[380px]"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[#d4b098]">
                      <Sparkles size={14} />
                      <span className="font-sans text-[10px] tracking-widest uppercase font-medium">Divisão Selecionada</span>
                    </div>
                    <h3 className="text-white font-serif text-2xl font-light">{selectedRoom.name}</h3>
                    <p className="font-sans text-stone-400 font-light text-xs leading-relaxed">
                      {selectedRoom.desc}
                    </p>
                  </div>

                  <div className="aspect-[16/10] overflow-hidden bg-black/30 border border-white/5 relative group">
                    <img 
                      src={selectedRoom.image} 
                      alt={selectedRoom.name} 
                      className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 6. IMMERSIVE VISUAL GALLERY */}
      <section className="bg-[#0d0907] py-24 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-16 text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-4">
              <span className="text-[#d4b098] font-sans tracking-[0.25em] uppercase text-xs font-semibold block">Crónicas Visuais</span>
              <h2 className="text-white font-serif text-3xl md:text-5xl font-light">Galeria de Pormenores</h2>
            </div>
            <p className="text-stone-400 font-sans font-light text-sm max-w-sm">
              Um registo da traça original em harmonia com acabamentos de luxo contemporâneo beirão.
            </p>
          </div>

          {/* Gallery grid layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {house.gallery.map((img, idx) => (
              <div 
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                className="group relative aspect-[3/4] overflow-hidden bg-black/30 border border-white/10 cursor-pointer shadow-lg hover:border-[#d4b098]/40 transition-colors"
              >
                <img 
                  src={img} 
                  alt={`${house.title} - ${idx}`} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-sans text-[10px] tracking-widest uppercase border border-white/20 bg-black/40 px-4 py-2 backdrop-blur-sm">
                    Ampliar Imagem
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div 
            className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
          >
            <div className="max-w-5xl w-full max-h-[85vh] relative flex flex-col items-center">
              <button 
                onClick={() => setLightboxIndex(null)}
                className="absolute -top-12 right-0 text-white hover:text-[#d4b098] font-sans text-xs tracking-widest uppercase"
              >
                Fechar [X]
              </button>
              <motion.img 
                src={house.gallery[lightboxIndex]} 
                alt="Enlarged gallery view"
                className="max-w-full max-h-[80vh] object-contain border border-white/10"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standard premium Footer */}
      <Footer />
    </div>
  );
}
