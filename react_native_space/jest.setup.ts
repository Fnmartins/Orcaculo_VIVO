import { configure } from '@testing-library/react-native';

// O primeiro render de cada arquivo de teste de tela às vezes passa de 1 s
// (carga inicial dos componentes e mocks do jest-expo). O padrão da biblioteca
// é 1000 ms, o que deixava os testes instáveis.
configure({ asyncUtilTimeout: 4000 });

// Com o cache do Jest frio (primeira execução num clone novo ou depois de
// `jest --clearCache`), o primeiro teste de tela chega a levar ~9 s e estourava
// o limite padrão de 5000 ms por teste. Reproduzido em 16/09 no merge da
// feat/painel-unificado.
jest.setTimeout(15000);

// `expo-av` procura o módulo nativo `ExponentAV` no import, que não existe sob
// Jest. Sem isto, qualquer suíte que alcance um componente com áudio morre
// inteira no carregamento — foi o que aconteceu com `AbaDecisoes` quando o
// comparador de vozes entrou na árvore de `components/previas`.
//
// Fica aqui, e não em cada teste, porque é fato do ambiente: o próximo
// componente com som não deveria ter de descobrir isso de novo.
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(async () => ({
        sound: {
          unloadAsync: jest.fn(async () => {}),
          setOnPlaybackStatusUpdate: jest.fn(),
          // Pausar e continuar entram aqui porque o componente os chama de
          // verdade: um mock sem eles faz a pausa cair no caminho de erro e o
          // teste falhar por um motivo que não existe em produção.
          pauseAsync: jest.fn(async () => {}),
          playAsync: jest.fn(async () => {}),
        },
      })),
    },
    setAudioModeAsync: jest.fn(async () => {}),
  },
}));
