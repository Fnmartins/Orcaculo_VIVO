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

  it('traz a data da última atualização', () => {
    // Texto exato, e não só "2026": a data é o aviso de que o documento mudou, e foi
    // a compra avulsa que o mudou.
    render(<Tela />);
    expect(screen.getByText('Última atualização: outubro de 2026')).toBeTruthy();
  });
});

describe('quem processa o pagamento: a Stripe', () => {
  // Estas asserções ancoram na frase que a tarefa escreveu, e não na palavra "Stripe"
  // solta. Na Política de Privacidade o nome aparece uma terceira vez, em "Seus direitos
  // (LGPD)" ("nosso processador de pagamentos (Stripe)", sobre as faturas já emitidas), e
  // essa menção é ANTERIOR a esta tarefa. Quando os dois documentos diziam Mercado Pago,
  // ela dizia Stripe: o texto se contradizia sozinho. Um teste genérico de "Stripe
  // aparece" seria satisfeito só por ela, e continuaria verde com as duas frases trocadas
  // apagadas.
  it('os Termos dizem que a Stripe processa os pagamentos', () => {
    render(<TelaTermos />);
    expect(screen.getByText(/Os pagamentos são processados pela Stripe/)).toBeTruthy();
  });

  it('a Privacidade declara a Stripe como quem processa o pagamento, em Dados que coletamos', () => {
    render(<TelaPrivacidade />);
    expect(screen.getByText(/o pagamento é processado pela Stripe/)).toBeTruthy();
  });

  it('a Privacidade lista a Stripe entre quem recebe dados, em Compartilhamento de dados', () => {
    // É esta frase que responde "com quem vocês compartilham", a obrigação de
    // transparência que o nome errado violava.
    render(<TelaPrivacidade />);
    expect(screen.getByText(/Stripe \(processamento de pagamentos\)/)).toBeTruthy();
  });
});

describe('Política de Privacidade: o que a compra avulsa mudou', () => {
  it('diz que o pagamento libera as compras avulsas, e não só os planos', () => {
    // Sem isto, "processar pagamentos e liberar os planos" afirma que pagar só libera
    // plano, o que deixa de ser verdade com a compra avulsa.
    render(<TelaPrivacidade />);
    expect(screen.getByText(/liberar os planos e as compras avulsas/)).toBeTruthy();
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
    // a leitura já gerada não. "Enquanto sua conta existir", e não "por tempo
    // indeterminado": a Política de Privacidade diz que excluir a conta apaga as
    // leituras, e a promessa maior contradiria o outro documento.
    expect(
      screen.getByText(/leitura já gerada permanece no seu histórico enquanto sua conta existir/),
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

  it('"Cancelamento e reembolso" diz que vale para planos, e manda a compra avulsa para a outra seção', () => {
    // As duas seções respondem diferente sobre a leitura já gerada: a de compra avulsa
    // manda entrar em contato, a de cancelamento promete reembolso sem exceção. Sem a
    // frase que reparte o escopo, quem lê as duas em sequência não sabe qual vale. Ela
    // não decide a política, só diz qual seção governa o quê.
    render(<TelaTermos />);
    expect(
      screen.getByText(
        /As regras acima valem para planos e assinaturas\. Para compras avulsas, o arrependimento está descrito na seção "Compra avulsa"\./,
      ),
    ).toBeTruthy();
  });
});
