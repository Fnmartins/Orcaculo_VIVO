import type { Perfil } from '../../services/auth';
import {
  CAMPOS_VAZIOS, camposDoPerfil, dataEmPortugues, faltaNoPerfil, nascimentoParaSalvar,
} from '../nascimentoDoPerfil';

/**
 * O perfil como fonte de verdade das três telas que pedem nome e data. O que
 * estes testes protegem, acima de tudo: que o nome de TELA nunca seja usado como
 * nome de nascimento. Um mapa numerológico calculado sobre apelido sai inteiro,
 * bonito e errado — e ninguém tem como perceber.
 *
 * Nenhum nome nem data aqui é de pessoa real.
 */

const perfil = (campos: Partial<Perfil>): Perfil => ({
  id: 'x', nome: null, email: null, avatar_url: null, data_nascimento: null,
  signo: null, caminho_espiritual: null, intencao: null,
  plano: 'gratuito', plano_valido_ate: null, consultas_restantes: 0,
  ...campos,
} as Perfil);

describe('camposDoPerfil', () => {
  it('sem perfil, tudo vazio', () => {
    expect(camposDoPerfil(null)).toEqual(CAMPOS_VAZIOS);
    expect(camposDoPerfil(undefined)).toEqual(CAMPOS_VAZIOS);
  });

  it('desmonta a data guardada e tira o zero à esquerda', () => {
    expect(camposDoPerfil(perfil({ data_nascimento: '1985-07-05' })))
      .toEqual({ nome: '', dia: '5', mes: '7', ano: '1985' });
  });

  it('NÃO usa o nome de tela como nome de nascimento', () => {
    // O ponto inteiro deste módulo. "Fabi" e "Fabiano da Silva Martins" são
    // coisas diferentes, e a numerologia trabalha sobre a segunda.
    expect(camposDoPerfil(perfil({ nome: 'Fabi' })).nome).toBe('');
    // Nem quando o nome de tela parece completo: continua sendo o nome de tela.
    expect(camposDoPerfil(perfil({ nome: 'Fabiano Martins' })).nome).toBe('');
  });

  it('usa o nome de nascimento quando ele existe', () => {
    const cheio = perfil({ nome: 'Fabi', nascimento_nome: '  Fabiano da Silva Martins  ' });
    expect(camposDoPerfil(cheio).nome).toBe('Fabiano da Silva Martins');
  });

  it('data em formato estranho vira campo vazio, não data remontada', () => {
    for (const data of ['13/07/1985', '1985-7-5', '85-07-13', 'ontem', '']) {
      expect(camposDoPerfil(perfil({ data_nascimento: data })))
        .toEqual({ nome: '', dia: '', mes: '', ano: '' });
    }
  });
});

describe('dataEmPortugues', () => {
  it('escreve o dia certo, sem escorregar de fuso', () => {
    // `new Date('1985-07-13')` é meia-noite UTC, e no Brasil isso volta para o
    // dia 12. Uma data de nascimento é dia de calendário, não instante.
    expect(dataEmPortugues('1985-07-13')).toBe('13 de julho de 1985');
    expect(dataEmPortugues('2000-01-01')).toBe('1 de janeiro de 2000');
    expect(dataEmPortugues('1999-12-31')).toBe('31 de dezembro de 1999');
  });

  it('devolve nulo para o que não é data guardada', () => {
    for (const valor of [null, undefined, '', '13/07/1985', '1985-13-01', 'ontem']) {
      expect(dataEmPortugues(valor)).toBeNull();
    }
  });
});

describe('faltaNoPerfil', () => {
  it('diz o que falta, para a tela explicar por que está pedindo', () => {
    expect(faltaNoPerfil(null)).toEqual(['nome', 'data']);
    expect(faltaNoPerfil(perfil({ data_nascimento: '1985-07-13' }))).toEqual(['nome']);
    expect(faltaNoPerfil(perfil({ nascimento_nome: 'Ana Paula Souza' }))).toEqual(['data']);
    expect(faltaNoPerfil(perfil({
      nascimento_nome: 'Ana Paula Souza', data_nascimento: '1985-07-13',
    }))).toEqual([]);
  });
});

describe('nascimentoParaSalvar', () => {
  it('nada mudou, nada grava', () => {
    // Uma escrita por leitura tirada carimbaria alteração sem alteração.
    const guardado = perfil({
      nascimento_nome: 'Ana Paula Souza', data_nascimento: '1985-07-13',
    });
    expect(nascimentoParaSalvar(
      { nome: 'Ana Paula Souza', dia: '13', mes: '7', ano: '1985' }, guardado,
    )).toBeNull();
  });

  it('grava o que o perfil ainda não tinha', () => {
    expect(nascimentoParaSalvar(
      { nome: 'Ana Paula Souza', dia: '13', mes: '7', ano: '1985' }, null,
    )).toEqual({ nascimento_nome: 'Ana Paula Souza', data_nascimento: '1985-07-13' });
  });

  it('monta a data com zero à esquerda, como a coluna espera', () => {
    expect(nascimentoParaSalvar(
      { nome: '', dia: '5', mes: '7', ano: '1985' }, null,
    )).toEqual({ data_nascimento: '1985-07-05' });
  });

  it('nome de uma palavra não é gravado', () => {
    // Não é nome de registro, e gravá-lo faria a próxima tela nascer errada.
    expect(nascimentoParaSalvar({ nome: 'Ana', dia: '', mes: '', ano: '' }, null)).toBeNull();
  });

  it('espaço repetido no meio do nome é normalizado', () => {
    expect(nascimentoParaSalvar(
      { nome: 'Ana   Paula    Souza', dia: '', mes: '', ano: '' }, null,
    )).toEqual({ nascimento_nome: 'Ana Paula Souza' });
  });

  it('data inválida não é gravada, e não impede o nome', () => {
    // 31 de fevereiro não existe. O nome, que está bom, sobe do mesmo jeito.
    expect(nascimentoParaSalvar(
      { nome: 'Ana Paula Souza', dia: '31', mes: '2', ano: '1985' }, null,
    )).toEqual({ nascimento_nome: 'Ana Paula Souza' });
  });

  it('corrigir o nome guardado grava a correção', () => {
    const guardado = perfil({ nascimento_nome: 'Ana Paula Souza' });
    expect(nascimentoParaSalvar(
      { nome: 'Ana Paula Souza Lima', dia: '', mes: '', ano: '' }, guardado,
    )).toEqual({ nascimento_nome: 'Ana Paula Souza Lima' });
  });
});
