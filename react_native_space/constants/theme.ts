import { Cores } from './colors';
import { Fontes, EscalaTipo } from './typography';
import { Espacamento, RaioBorda } from './spacing';

export const Tema = {
  cores: Cores,
  fontes: Fontes,
  escalaTipo: EscalaTipo,
  espacamento: Espacamento,
  raioBorda: RaioBorda,
} as const;

export type TipoTema = typeof Tema;
