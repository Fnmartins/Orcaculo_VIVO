import React from 'react';
import { render } from '@testing-library/react-native';
import { RodaZodiacal } from '../RodaMapa';

/**
 * A conta da roda está testada em `utils/__tests__/roda.test.ts`, sem renderizar.
 * Aqui o que se confere é outra coisa: que o desenho põe na tela o que o plano
 * permite e nada além — casa é conteúdo pago, e um vazamento aqui seria
 * invisível numa revisão de código.
 */

function nos(arvore: any, tipo: string, achados: any[] = []): any[] {
  if (!arvore) return achados;
  if (Array.isArray(arvore)) {
    for (const filho of arvore) nos(filho, tipo, achados);
    return achados;
  }
  if (typeof arvore === 'object' && arvore.type) {
    if (arvore.type === tipo) achados.push(arvore);
    nos(arvore.children, tipo, achados);
  }
  return achados;
}

const DOZE_CUSPIDES = [12, 40, 72, 105, 140, 170, 192, 220, 252, 285, 320, 350];

function montar(props: Partial<React.ComponentProps<typeof RodaZodiacal>> = {}) {
  return render(
    <RodaZodiacal
      solIdx={0}
      marcadores={[{ longitude: 10, label: '☀', cor: '#F1C40F' }]}
      ascendente={12}
      cuspides={DOZE_CUSPIDES}
      {...props}
    />,
  ).toJSON();
}

describe('roda do mapa', () => {
  it('desenha as doze cúspides quando o plano dá direito a casa', () => {
    const arvore = montar();
    // 12 divisórias de signo + 1 fatia do Sol pintada + 12 cúspides.
    expect(nos(arvore, 'RNSVGPath')).toHaveLength(25);
    // 12 símbolos de signo + 12 números de casa + 1 marcador.
    expect(nos(arvore, 'RNSVGText')).toHaveLength(25);
  });

  it('sem direito a casa, não desenha cúspide nem número de casa', () => {
    // Não é só estética: o número da casa é a informação paga. Se ela aparecer
    // na roda do plano gratuito, o produto vazou pelo desenho.
    const arvore = montar({ cuspides: null });
    expect(nos(arvore, 'RNSVGPath')).toHaveLength(13);
    expect(nos(arvore, 'RNSVGText')).toHaveLength(13);
  });

  it('os quatro eixos saem mais grossos que as outras oito cúspides', () => {
    const arvore = montar();
    const grossuras = nos(arvore, 'RNSVGPath')
      .map((no) => no.props?.strokeWidth)
      .filter((g) => g === 1.4);
    expect(grossuras).toHaveLength(4);
  });

  it('um marcador por corpo, e um círculo para cada', () => {
    const arvore = montar({
      marcadores: [
        { longitude: 10, label: '☀', cor: '#F1C40F' },
        { longitude: 11, label: '☾', cor: '#6E8390' },
        { longitude: 200, label: '☿', cor: '#F1C40F' },
      ],
    });
    // 5 anéis da roda + 3 marcadores.
    expect(nos(arvore, 'RNSVGCircle')).toHaveLength(8);
  });

  it('sem ascendente ainda desenha, só não gira', () => {
    // Sem hora de nascimento a roda continua valendo para Sol e Lua; o que ela
    // não pode é fingir um ascendente para se orientar.
    const arvore = montar({ ascendente: null, cuspides: null });
    expect(nos(arvore, 'RNSVGText')).toHaveLength(13);
  });
});
