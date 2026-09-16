import { filtrarUsuarios, ROTULO_PLANO, type UsuarioAcesso } from '../acessos';

function usuario(parcial: Partial<UsuarioAcesso> & Pick<UsuarioAcesso, 'id'>): UsuarioAcesso {
  return {
    nome: null,
    email: null,
    criado_em: '2026-09-15T00:00:00Z',
    plano: 'gratuito',
    is_super_admin: false,
    ...parcial,
  };
}

const lista = [
  usuario({ id: '1', nome: 'João Mística', email: 'joao@exemplo.com' }),
  usuario({ id: '2', nome: 'Marcio', email: 'marcio@exemplo.com' }),
  usuario({ id: '3', nome: null, email: 'semnome@exemplo.com' }),
];

describe('filtrarUsuarios', () => {
  it('termo vazio ou só espaços devolve todos', () => {
    expect(filtrarUsuarios(lista, '')).toHaveLength(3);
    expect(filtrarUsuarios(lista, '   ')).toHaveLength(3);
  });

  it('acha pelo nome ignorando acento e caixa', () => {
    expect(filtrarUsuarios(lista, 'JOAO mis').map((u) => u.id)).toEqual(['1']);
  });

  it('acha pelo e-mail, inclusive de quem não tem nome', () => {
    expect(filtrarUsuarios(lista, 'semnome@').map((u) => u.id)).toEqual(['3']);
  });

  it('sem correspondência devolve lista vazia', () => {
    expect(filtrarUsuarios(lista, 'ninguém')).toEqual([]);
  });
});

describe('ROTULO_PLANO', () => {
  it('tem rótulo para os quatro planos', () => {
    expect(ROTULO_PLANO).toEqual({
      gratuito: 'Gratuito', iniciante: 'Iniciante', explorador: 'Explorador', mestre: 'Mestre',
    });
  });
});
