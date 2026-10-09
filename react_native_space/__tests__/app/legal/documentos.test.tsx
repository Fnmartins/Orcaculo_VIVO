import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Um mock só: o ícone. As telas legais montam `PaginaLegal`, e tudo o que ele puxa
// (gradiente, área segura, roteador) renderiza sob jest-expo sem ajuda. O ícone real
// também renderiza, mas dispara o aviso "not wrapped in act(...)" a cada tela, e as
// asserções abaixo olham só texto — o aviso seria ruído escondendo um aviso de verdade.
jest.mock('@expo/vector-icons/Ionicons', () => () => null);

import TelaTermos from '../../../app/legal/termos';
import TelaPrivacidade from '../../../app/legal/privacidade';

const telas = [
  ['Termos de Uso', TelaTermos],
  ['Política de Privacidade', TelaPrivacidade],
] as const;

describe.each(telas)('%s', (_nome, Tela) => {
  it('não nomeia o Mercado Pago', () => {
    // O nome errado já esteve aqui: os dois documentos diziam que o pagamento é
    // processado pelo Mercado Pago, e nenhum código do app usa isso — as functions de
    // pagamento são todas Stripe. Na Política de Privacidade isso não é cosmético: é
    // ela que declara QUEM RECEBE os dados de pagamento da pessoa, o que é obrigação
    // de transparência da LGPD. Declarar o fornecedor errado é declarar errado. Este
    // teste existe para o nome não voltar numa edição de texto ou num merge.
    render(<Tela />);
    // Sem espaço também: "MercadoPago" é como o nome aparece em código e em variável.
    expect(screen.queryAllByText(/mercado\s*pago/i)).toHaveLength(0);
  });

  it('nomeia a Stripe, que é quem processa o pagamento', () => {
    // Complementa o teste acima: sem este, apagar a menção ao processador, em vez de
    // trocá-la, também deixaria os documentos "sem Mercado Pago".
    render(<Tela />);
    expect(screen.queryAllByText(/Stripe/).length).toBeGreaterThan(0);
  });

  it('traz a data da última atualização', () => {
    // Texto exato, e não só "2026": a data é o aviso de que o documento mudou, e foi
    // a compra avulsa que o mudou.
    render(<Tela />);
    expect(screen.getByText('Última atualização: outubro de 2026')).toBeTruthy();
  });
});

describe('Termos de Uso: o que a compra avulsa vendeu', () => {
  it('tem a seção "Compra avulsa", com o prazo de 90 dias e a leitura que permanece', () => {
    render(<TelaTermos />);
    // O título sai numerado ("6. Compra avulsa"), por isso o padrão aceita qualquer
    // número: a seção pode mudar de posição sem o teste ter de saber.
    expect(screen.getByText(/^\d+\. Compra avulsa$/)).toBeTruthy();
    expect(
      screen.getByText(/vale por 90 \(noventa\) dias a partir da confirmação do pagamento/),
    ).toBeTruthy();
    // É a metade do prazo que a pessoa mais precisa ler: o direito de gerar expira,
    // a leitura já gerada não.
    expect(
      screen.getByText(/leitura já gerada permanece no seu histórico por tempo indeterminado/),
    ).toBeTruthy();
  });

  it('continua tendo "Cancelamento e reembolso", com o arrependimento de 7 dias', () => {
    // A seção nova entrou ao lado desta e também fala em arrependimento de 7 dias.
    // Por isso a asserção sobre o texto antigo usa a frase que SÓ a seção antiga tem
    // (a contagem "a partir da contratação"): uma busca por "arrependimento" sozinha
    // seria satisfeita pela seção nova, e passaria mesmo com esta apagada.
    render(<TelaTermos />);
    expect(screen.getByText(/^\d+\. Cancelamento e reembolso$/)).toBeTruthy();
    expect(
      screen.getByText(
        /reembolso em até 7 \(sete\) dias corridos a partir da contratação \(direito de arrependimento\)/,
      ),
    ).toBeTruthy();
  });
});
