import type { RouteHandler } from '../../types';
import { json } from '../../../pms/http';
// Retired endpoint: do not leave content mutation accessible behind hidden UI.
export const ALL: RouteHandler = async () => json(410,{error:'Configuração disponível apenas na manutenção técnica.'});
