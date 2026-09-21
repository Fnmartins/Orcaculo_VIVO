const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockPodeVoltar = true;
jest.mock('expo-router', () => ({
  router: {
    canGoBack: () => mockPodeVoltar,
    back: (...a: unknown[]) => mockBack(...a),
    replace: (...a: unknown[]) => mockReplace(...a),
  },
}));

import { voltarOuIr } from '../navegacao';

beforeEach(() => {
  jest.clearAllMocks();
  mockPodeVoltar = true;
});

describe('voltarOuIr', () => {
  it('volta para a tela anterior quando há histórico', () => {
    voltarOuIr();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('vai para a Início quando não há histórico', () => {
    mockPodeVoltar = false;
    voltarOuIr();
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('usa o destino informado quando não há histórico', () => {
    mockPodeVoltar = false;
    voltarOuIr('/perfil');
    expect(mockReplace).toHaveBeenCalledWith('/perfil');
  });
});
