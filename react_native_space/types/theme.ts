import type { Tema } from '../constants/theme';

export type TipoTema = typeof Tema;

export interface CoresInterface {
  primaria: string;
  acento: string;
  secundaria: string;
  roxoMistico: string;
  fundoClaro: string;
  fundoEscuro: string;
  superficie: string;
  textoPrimario: string;
  textoSecundario: string;
  textoClaro: string;
  erro: string;
}
