import { Cores } from '../colors';
import { PLANETAS } from '../../data/astrologia';

/**
 * O app monta transparência colando dois dígitos no fim da cor — `cor + '30'` —
 * em vinte lugares, da roda do mapa aos cartões de consulta. Isso só é válido
 * com hex de seis dígitos: `'#888' + '30'` vira `'#88830'`, que o
 * react-native-svg recusa com um aviso no console e desenha sem preenchimento.
 *
 * Apareceu como aviso ao testar a roda em 28/09. O teste existe para a
 * convenção quebrar alto na próxima vez, em vez de virar um marcador invisível
 * numa tela.
 */

const SEIS_DIGITOS = /^#[0-9a-fA-F]{6}$/;

function hexSolidos(valores: Record<string, string>): [string, string][] {
  return Object.entries(valores).filter(([, v]) => typeof v === 'string' && v.startsWith('#'));
}

describe('paleta', () => {
  it('toda cor hex da paleta tem seis dígitos', () => {
    for (const [nome, valor] of hexSolidos(Cores as unknown as Record<string, string>)) {
      expect(valor).toMatch(SEIS_DIGITOS);
      expect(nome).toBeTruthy();
    }
  });

  it('toda cor de planeta tem seis dígitos', () => {
    for (const planeta of PLANETAS) {
      expect(planeta.cor).toMatch(SEIS_DIGITOS);
    }
  });
});
