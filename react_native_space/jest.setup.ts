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
