import { act, renderHook } from '@testing-library/react-native';

// `useFocusEffect` guarda o efeito que o hook passa, em vez de rodá-lo: quem dispara é
// o teste, como o roteador dispara quando a tela ganha foco. Assim "relê ao voltar da
// Stripe" é algo que se prova (chamar o efeito de novo muda o número), e não só se afirma.
type Efeito = () => void | (() => void);
let efeito: Efeito | null = null;
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: Efeito) => { efeito = cb; },
}));

const mockCreditos = jest.fn();
jest.mock('../../services/avulso', () => ({
  creditosDaPessoa: () => mockCreditos(),
}));

import { useCreditoAvulso } from '../useCreditoAvulso';

/** Faz a tela ganhar foco: roda o efeito e devolve a limpeza, como o roteador. */
async function ganharFoco(): Promise<() => void> {
  let limpeza: void | (() => void);
  await act(async () => { limpeza = efeito!(); });
  return () => { if (typeof limpeza === 'function') limpeza(); };
}

beforeEach(() => {
  efeito = null;
  mockCreditos.mockReset();
});

describe('useCreditoAvulso', () => {
  it('começa em zero: sem ter lido, não afirma que a pessoa tem crédito', () => {
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    expect(result.current.credito).toBe(0);
    expect(mockCreditos).not.toHaveBeenCalled();
  });

  it('devolve só os créditos DESTE produto', async () => {
    mockCreditos.mockResolvedValue({ mapa: 2, vocacao: 1 });
    const mapa = renderHook(() => useCreditoAvulso('mapa'));
    await ganharFoco();
    expect(mapa.result.current.credito).toBe(2);

    const vocacao = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(vocacao.result.current.credito).toBe(1);
  });

  it('produto sem crédito fica em zero', async () => {
    mockCreditos.mockResolvedValue({ mapa: 3 });
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(result.current.credito).toBe(0);
  });

  it('relê ao ganhar foco de novo: quem volta da Stripe vê o crédito recém-comprado', async () => {
    mockCreditos.mockResolvedValueOnce({}).mockResolvedValueOnce({ vocacao: 1 });
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));

    await ganharFoco();
    expect(result.current.credito).toBe(0);

    await ganharFoco();
    expect(result.current.credito).toBe(1);
    expect(mockCreditos).toHaveBeenCalledTimes(2);
  });

  it('resposta que chega depois de a tela perder o foco não é aplicada', async () => {
    // Sem a guarda, uma leitura lenta pousaria sobre a tela que já saiu de foco.
    let responder!: (v: Record<string, number>) => void;
    mockCreditos.mockReturnValue(new Promise((r) => { responder = r; }));
    const { result } = renderHook(() => useCreditoAvulso('mapa'));

    let limpeza!: () => void;
    await act(async () => {
      const devolvida = efeito!();
      limpeza = typeof devolvida === 'function' ? devolvida : () => undefined;
    });
    limpeza();
    await act(async () => { responder({ mapa: 5 }); });

    expect(result.current.credito).toBe(0);
  });
});
