import { jogarBuzios, QUANTIDADE_BUZIOS, ODUS, regentesDoOdu } from '../buzios';

afterEach(() => {
  jest.restoreAllMocks();
});

/** Força todos os búzios a caírem abertos (true) ou fechados (false). */
function forcarSorteio(abertos: boolean) {
  jest.spyOn(Math, 'random').mockReturnValue(abertos ? 0.99 : 0.01);
}

describe('merindilogun', () => {
  it('joga 16 búzios, como na tradição', () => {
    expect(QUANTIDADE_BUZIOS).toBe(16);
    expect(jogarBuzios().buzios).toHaveLength(16);
  });

  it('tem um odu para cada quantidade de búzios abertos, de 0 a 16', () => {
    for (let abertos = 0; abertos <= QUANTIDADE_BUZIOS; abertos++) {
      const odus = ODUS.filter((o) => o.abertos === abertos);
      expect(odus).toHaveLength(1);
    }
  });

  it('todos abertos é Alafiá', () => {
    forcarSorteio(true);
    const { buzios, odu } = jogarBuzios();
    expect(buzios.every(Boolean)).toBe(true);
    expect(odu.nome).toBe('Alafiá');
  });

  // Antes de 21/09/2026, nenhum búzio aberto virava o odu 12 — um resultado que
  // a tradição não reconhece. Agora é Opirá: o jogo não se abriu.
  it('nenhum aberto é Opirá, não um odu qualquer', () => {
    forcarSorteio(false);
    const { buzios, odu } = jogarBuzios();
    expect(buzios.some(Boolean)).toBe(false);
    expect(odu.nome).toBe('Opirá');
    expect(odu.abertos).toBe(0);
    expect(odu.conselho).toMatch(/lance de novo/i);
  });

  it('o odu escolhido corresponde à quantidade de búzios abertos', () => {
    for (let i = 0; i < 30; i++) {
      const { buzios, odu } = jogarBuzios();
      expect(odu.abertos).toBe(buzios.filter(Boolean).length);
    }
  });
});

// O conselho de 24/09 encontrou os dois casos abaixo em produção: a tela
// mostrava um regente e o texto da IA citava outro, e o Opirá mandava um
// travessão para a IA como se fosse nome de orixá.
describe('regentesDoOdu', () => {
  it('separa os odus que têm dois regentes', () => {
    expect(regentesDoOdu('Oxossi / Yemanjá')).toEqual(['Oxossi', 'Yemanjá']);
    expect(regentesDoOdu('Iansã / Egúm')).toEqual(['Iansã', 'Egúm']);
    expect(regentesDoOdu('Obá / Ogum')).toEqual(['Obá', 'Ogum']);
  });

  it('devolve um só quando é um só', () => {
    expect(regentesDoOdu('Exú')).toEqual(['Exú']);
  });

  it('travessão do Opirá não é nome de orixá', () => {
    expect(regentesDoOdu('—')).toEqual([]);
    expect(regentesDoOdu('-')).toEqual([]);
    expect(regentesDoOdu('  ')).toEqual([]);
  });

  it('nenhum odu perde regente pelo caminho', () => {
    for (const odu of ODUS) {
      const nomes = regentesDoOdu(odu.regente);
      // Opirá é o único sem regente, e é o único com nenhum búzio aberto.
      if (odu.abertos === 0) expect(nomes).toEqual([]);
      else expect(nomes.length).toBeGreaterThan(0);
      expect(nomes.some((n) => n.includes('/'))).toBe(false);
    }
  });
});
