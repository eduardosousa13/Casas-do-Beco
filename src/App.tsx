/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import OndeEstamos from './pages/OndeEstamos';
import CasaDetail from './pages/CasaDetail';
import SobreNos from './pages/SobreNos';
import Contactos from './pages/Contactos';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onde-estamos" element={<OndeEstamos />} />
        <Route path="/sobre-nos" element={<SobreNos />} />
        <Route path="/contactos" element={<Contactos />} />
        <Route path="/casas/:id" element={<CasaDetail />} />
      </Routes>
    </Router>
  );
}
