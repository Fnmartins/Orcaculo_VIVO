import { configure } from '@testing-library/react-native';

// O primeiro render de cada arquivo de teste de tela às vezes passa de 1 s
// (carga inicial dos componentes e mocks do jest-expo). O padrão da biblioteca
// é 1000 ms, o que deixava os testes instáveis.
configure({ asyncUtilTimeout: 4000 });
