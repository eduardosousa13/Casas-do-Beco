import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Estrutura from './site/Estrutura';
import Inicio from './site/paginas/Inicio';
import Casa from './site/paginas/Casa';
import Mapa from './site/paginas/Mapa';
import Reservas from './site/paginas/Reservas';
import Tradicoes from './site/paginas/Tradicoes';
import SobreNos from './site/paginas/SobreNos';
import { Privacidade, Termos } from './site/paginas/Legal';
import NaoEncontrada from './site/paginas/NaoEncontrada';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Estrutura />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/casa" element={<Casa />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/reservas" element={<Reservas />} />
          <Route path="/tradicoes" element={<Tradicoes />} />
          <Route path="/sobre-nos" element={<SobreNos />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
