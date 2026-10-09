// hooks/useCreditoAvulso.ts
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { creditosDaPessoa } from '../services/avulso';

/**
 * Quantos créditos avulsos não gastos a pessoa tem DESTE produto.
 *
 * Relê a cada vez que a tela ganha foco, e não só na montagem: a compra
 * acontece FORA do app, no navegador da Stripe. Quem paga e volta encontraria a
 * tela exatamente como a deixou — trancada, com o crédito recém-comprado
 * invisível, e sem nenhuma pista de que o pagamento funcionou.
 *
 * `useFocusEffect` é o que `app/lei-atracao/index.tsx` já usa para o mesmo fim.
 */
export function useCreditoAvulso(oraculo: 'mapa' | 'vocacao') {
  const [credito, setCredito] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      creditosDaPessoa().then((porOraculo) => {
        if (vivo) setCredito(porOraculo[oraculo] ?? 0);
      });
      return () => { vivo = false; };
    }, [oraculo]),
  );

  return { credito };
}
