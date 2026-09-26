import {
  decidirUso,
  restanteHoje,
  type ConfiguracaoIA,
} from '../../supabase/functions/_shared/limites';

const gratuito: ConfiguracaoIA = {
  imagem_ligada: false,
  interpretacao_ligada: true,
  pergunta_ligada: true,
  limite_dia: 2,
};

const mestre: ConfiguracaoIA = {
  imagem_ligada: true,
  interpretacao_ligada: true,
  pergunta_ligada: true,
  limite_dia: 0,
};

describe('decidirUso', () => {
  it('deixa passar quem ainda não bateu no limite do dia', () => {
    expect(decidirUso('pergunta', gratuito, 1, false)).toEqual({
      permitido: true, usadoHoje: 1, limiteDia: 2,
    });
  });

  it('barra no limite, e diz que foi o limite', () => {
    const v = decidirUso('pergunta', gratuito, 2, false);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('limite_dia');
    expect(restanteHoje(v)).toBe(0);
  });

  it('recurso desligado no plano nem chega a olhar o contador', () => {
    const v = decidirUso('imagem', gratuito, 0, false);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toBe('desligado');
  });

  it('limite_dia zero quer dizer sem limite diário', () => {
    const v = decidirUso('imagem', mestre, 900, false);
    expect(v.permitido).toBe(true);
    expect(v.limiteDia).toBeNull();
    expect(restanteHoje(v)).toBeNull();
  });

  it('super-admin passa mesmo com o recurso desligado no plano', () => {
    const v = decidirUso('imagem', gratuito, 50, true);
    expect(v.permitido).toBe(true);
    expect(v.limiteDia).toBeNull();
  });

  it('sem linha de configuração, deixa passar — controle novo não derruba o que já rodava', () => {
    expect(decidirUso('interpretacao', null, 10, false).permitido).toBe(true);
  });

  it('contador sujo (negativo, NaN) conta como zero', () => {
    expect(decidirUso('pergunta', gratuito, -5, false).usadoHoje).toBe(0);
    expect(decidirUso('pergunta', gratuito, Number.NaN, false).usadoHoje).toBe(0);
  });
});
