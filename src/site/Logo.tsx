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
