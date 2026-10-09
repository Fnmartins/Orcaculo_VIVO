// hooks/useCreditoAvulso.ts
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { creditosDaPessoa } from '../services/avulso';

export interface CreditoAvulso {
  /** Quantos créditos não gastos e não vencidos a pessoa tem DESTE produto. */
  credito: number;
  /**
   * A pessoa já gastou algum crédito deste produto. A leitura que ele pagou foi gerada e
   * mora no servidor: a tela tem de deixar a pessoa pedi-la de novo, e não trancá-la e
   * oferecer outra compra logo abaixo de um texto que promete "fica para sempre".
   */
  gastou: boolean;
  /**
   * A leitura falhou. É diferente de "zero": a tela não pode convidar a comprar sem saber se
   * já se comprou, e na vocação não pode esconder o botão de quem talvez tenha pago.
   */
  falhou: boolean;
}

const SEM_LEITURA: CreditoAvulso = { credito: 0, gastou: false, falhou: false };

/**
 * O que a pessoa tem de compra avulsa DESTE produto.
 *
 * Relê quando a tela ganha foco, e não só na montagem, e também quando o app volta a ficar
 * ativo. A compra acontece FORA do app, no navegador da Stripe. Quem paga e volta
 * encontraria a tela exatamente como a deixou, trancada, com o crédito recém-comprado
 * invisível e sem nenhuma pista de que o pagamento funcionou.
 *
 * Os dois gatilhos existem porque cada um cobre o que o outro não vê. No celular, ir ao
 * navegador e voltar não troca de rota, então `useFocusEffect` não dispara e só o
 * `AppState` percebe a volta. Já o foco é o que pega quem sai da tela e retorna a ela por
 * dentro do app, em qualquer plataforma, sem o app ter ido para segundo plano. Na web o
 * `AppState` acompanha a visibilidade da aba, e o foco segue sendo o caminho da navegação.
 *
 * `useFocusEffect` é o que `app/lei-atracao/index.tsx` já usa para o mesmo fim. O
 * `AppState` fica DENTRO dele, e não solto: só a tela em foco escuta, e a escuta acaba
 * quando ela perde o foco.
 */
export function useCreditoAvulso(oraculo: 'mapa' | 'vocacao'): CreditoAvulso {
  const [estado, setEstado] = useState<CreditoAvulso>(SEM_LEITURA);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;

      const ler = () => {
        creditosDaPessoa()
          .then((c) => {
            if (!vivo) return;
            setEstado({
              credito: c.porOraculo[oraculo] ?? 0,
              gastou: (c.consumidasPorOraculo[oraculo] ?? 0) > 0,
              falhou: c.falhou,
            });
          })
          // Sem isto, uma rejeição vira erro não tratado e derruba a tela. Rejeitar é falha de
          // leitura, igual a qualquer outra: `falhou`, e não "zero".
          .catch(() => {
            if (vivo) setEstado({ ...SEM_LEITURA, falhou: true });
          });
      };

      ler();
      const escuta = AppState.addEventListener('change', (situacao) => {
        if (situacao === 'active') ler();
      });
      return () => {
        vivo = false;
        escuta.remove();
      };
    }, [oraculo]),
  );

  return estado;
}
