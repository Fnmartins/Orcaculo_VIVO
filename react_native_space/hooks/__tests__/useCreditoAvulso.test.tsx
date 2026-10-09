import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

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

interface Leitura {
  porOraculo?: Record<string, number>;
  consumidasPorOraculo?: Record<string, number>;
  falhou?: boolean;
}
/** O que o serviço devolve, com o que cada teste não cita já em branco. */
const leitura = (l: Leitura = {}) => ({
  porOraculo: {}, consumidasPorOraculo: {}, falhou: false, ...l,
});

// O `AppState` também é guardado, e disparado à mão: é o que acontece quando a pessoa volta
// do navegador da Stripe. `remover` conta quantas escutas foram desfeitas.
type Situacao = 'active' | 'background' | 'inactive';
let mudarSituacao: ((s: Situacao) => void) | null = null;
const remover = jest.fn();
let escuta: jest.SpyInstance;

/** Faz a tela ganhar foco: roda o efeito e devolve a limpeza, como o roteador. */
async function ganharFoco(): Promise<() => void> {
  let limpeza: void | (() => void);
  await act(async () => { limpeza = efeito!(); });
  return () => { if (typeof limpeza === 'function') limpeza(); };
}

beforeEach(() => {
  efeito = null;
  mudarSituacao = null;
  remover.mockReset();
  mockCreditos.mockReset();
  escuta = jest.spyOn(AppState, 'addEventListener').mockImplementation(
    ((tipo: string, cb: (s: Situacao) => void) => {
      if (tipo === 'change') mudarSituacao = cb;
      return { remove: remover };
    }) as never,
  );
});
afterEach(() => { escuta.mockRestore(); });

describe('useCreditoAvulso', () => {
  it('começa sem nada: sem ter lido, não afirma crédito nem falha', () => {
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    expect(result.current).toEqual({ credito: 0, gastou: false, falhou: false });
    expect(mockCreditos).not.toHaveBeenCalled();
  });

  it('devolve só os créditos DESTE produto', async () => {
    mockCreditos.mockResolvedValue(leitura({ porOraculo: { mapa: 2, vocacao: 1 } }));
    const mapa = renderHook(() => useCreditoAvulso('mapa'));
    await ganharFoco();
    expect(mapa.result.current.credito).toBe(2);

    const vocacao = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(vocacao.result.current.credito).toBe(1);
  });

  it('produto sem crédito fica em zero', async () => {
    mockCreditos.mockResolvedValue(leitura({ porOraculo: { mapa: 3 } }));
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(result.current.credito).toBe(0);
    expect(result.current.falhou).toBe(false);
  });

  it('`gastou` vale só para compras já gastas DESTE produto', async () => {
    mockCreditos.mockResolvedValue(leitura({ consumidasPorOraculo: { vocacao: 2 } }));
    const vocacao = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(vocacao.result.current).toEqual({ credito: 0, gastou: true, falhou: false });

    // Gastar um crédito de vocação não reabre a leitura de mapa.
    const mapa = renderHook(() => useCreditoAvulso('mapa'));
    await ganharFoco();
    expect(mapa.result.current.gastou).toBe(false);
  });

  it('leitura que falhou chega como `falhou`, e não como "zero crédito"', async () => {
    mockCreditos.mockResolvedValue(leitura({ falhou: true }));
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(result.current).toEqual({ credito: 0, gastou: false, falhou: true });
  });

  it('serviço que rejeita não derruba a tela: vira `falhou`', async () => {
    // Sem o `.catch`, a rejeição seria um erro não tratado.
    mockCreditos.mockRejectedValue(new Error('rede caiu'));
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(result.current).toEqual({ credito: 0, gastou: false, falhou: true });
  });

  it('relê ao ganhar foco de novo: quem volta da Stripe vê o crédito recém-comprado', async () => {
    mockCreditos
      .mockResolvedValueOnce(leitura())
      .mockResolvedValueOnce(leitura({ porOraculo: { vocacao: 1 } }));
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));

    await ganharFoco();
    expect(result.current.credito).toBe(0);

    await ganharFoco();
    expect(result.current.credito).toBe(1);
    expect(mockCreditos).toHaveBeenCalledTimes(2);
  });

  it('resposta que chega depois de a tela perder o foco não é aplicada', async () => {
    // Sem a guarda, uma leitura lenta pousaria sobre a tela que já saiu de foco.
    let responder!: (v: ReturnType<typeof leitura>) => void;
    mockCreditos.mockReturnValue(new Promise((r) => { responder = r; }));
    const { result } = renderHook(() => useCreditoAvulso('mapa'));

    const perderFoco = await ganharFoco();
    perderFoco();
    await act(async () => { responder(leitura({ porOraculo: { mapa: 5 } })); });

    expect(result.current.credito).toBe(0);
  });

  it('rejeição que chega depois de a tela perder o foco também não é aplicada', async () => {
    let rejeitar!: (e: Error) => void;
    mockCreditos.mockReturnValue(new Promise((_, r) => { rejeitar = r; }));
    const { result } = renderHook(() => useCreditoAvulso('mapa'));

    const perderFoco = await ganharFoco();
    perderFoco();
    await act(async () => { rejeitar(new Error('tarde')); });

    expect(result.current.falhou).toBe(false);
  });
});

describe('useCreditoAvulso quando o app volta do navegador', () => {
  // No celular a compra sai do app e volta sem trocar de rota: o foco não dispara, e só
  // o `AppState` percebe a volta.

  it('relê quando o app volta a ficar ativo', async () => {
    mockCreditos
      .mockResolvedValueOnce(leitura())
      .mockResolvedValueOnce(leitura({ porOraculo: { vocacao: 1 } }));
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    expect(result.current.credito).toBe(0);

    await act(async () => { mudarSituacao!('active'); });

    expect(result.current.credito).toBe(1);
    expect(mockCreditos).toHaveBeenCalledTimes(2);
  });

  it('ir para segundo plano não relê: só a VOLTA interessa', async () => {
    mockCreditos.mockResolvedValue(leitura());
    renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();

    await act(async () => { mudarSituacao!('background'); });
    await act(async () => { mudarSituacao!('inactive'); });

    expect(mockCreditos).toHaveBeenCalledTimes(1);
  });

  it('escuta só enquanto a tela está em foco, e desfaz a escuta ao perder o foco', async () => {
    mockCreditos.mockResolvedValue(leitura());
    renderHook(() => useCreditoAvulso('vocacao'));
    expect(escuta).not.toHaveBeenCalled();

    const perderFoco = await ganharFoco();
    expect(escuta).toHaveBeenCalledWith('change', expect.any(Function));
    expect(remover).not.toHaveBeenCalled();

    perderFoco();
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it('resposta de uma releitura que chega depois de a tela perder o foco não é aplicada', async () => {
    mockCreditos.mockResolvedValueOnce(leitura());
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    const perderFoco = await ganharFoco();

    let responder!: (v: ReturnType<typeof leitura>) => void;
    mockCreditos.mockReturnValueOnce(new Promise((r) => { responder = r; }));
    await act(async () => { mudarSituacao!('active'); });
    perderFoco();
    await act(async () => { responder(leitura({ porOraculo: { vocacao: 9 } })); });

    expect(result.current.credito).toBe(0);
  });

  it('o foco continua funcionando com a escuta do app armada', async () => {
    // Os dois gatilhos, e não um no lugar do outro.
    mockCreditos
      .mockResolvedValueOnce(leitura())
      .mockResolvedValueOnce(leitura({ porOraculo: { vocacao: 2 } }));
    const { result } = renderHook(() => useCreditoAvulso('vocacao'));
    await ganharFoco();
    await ganharFoco();
    expect(result.current.credito).toBe(2);
  });
});
