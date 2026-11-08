import { cheio, TRANSFORMA, VISTA, VISTA_EMBLEMA } from './logotipo';

// Logótipo e emblema sem animação. Ficam à parte do Marca.tsx para o admin os usar sem carregar o GSAP.
// Logótipo completo (emblema + letras), pintado com a cor do texto.
export function Logo({ className = '', titulo = 'Casas do Beco, Ladoeiro' }: { className?: string; titulo?: string }) {
  return (
    <svg viewBox={VISTA} className={className} role="img" aria-label={titulo} fill="currentColor">
      <g transform={TRANSFORMA}>{cheio.map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  );
}

// Só o emblema (o arco com a casa, os ciprestes e a melancia), sem as letras.
export function Emblema({ className = '', titulo }: { className?: string; titulo?: string }) {
  return (
    <svg viewBox={VISTA_EMBLEMA} className={className} fill="currentColor" role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <g transform={TRANSFORMA}>{cheio.slice(0, 20).map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  );
}

// Marcador da casa nos mapas: uma gota verde com o emblema num círculo claro. A ponta fica no fundo do
// desenho, por isso quem o usa deve ancorá-lo pela base.
export function PinoCasa({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 52" className={className} aria-hidden="true">
      <path d="M20 51C14 42 3 31 3 19a17 17 0 0 1 34 0c0 12-11 23-17 32Z" fill="var(--color-musgo)" stroke="var(--color-creme)" strokeWidth="1.5" />
      <circle cx="20" cy="19" r="12.5" fill="var(--color-creme)" />
      <svg x="13.2" y="10.4" width="13.6" height="17.2" viewBox={VISTA_EMBLEMA} fill="#1d1a16">
        <g transform={TRANSFORMA}>{cheio.slice(0, 20).map((d, i) => <path key={i} d={d} />)}</g>
      </svg>
    </svg>
  );
}
