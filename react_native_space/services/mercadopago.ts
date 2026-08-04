import axios from 'axios';

const MP_API = 'https://api.mercadopago.com';

export interface PlanoMP {
  id: string;
  titulo: string;
  descricao: string;
  valor: number;
  periodo: 'mensal' | 'anual';
}

export const PLANOS_MP: PlanoMP[] = [
  {
    id: 'iniciante',
    titulo: 'Plano Iniciante',
    descricao: '4 leituras por mês + acesso a todos os oráculos',
    valor: 29.90,
    periodo: 'mensal',
  },
  {
    id: 'explorador',
    titulo: 'Plano Explorador',
    descricao: 'Leituras ilimitadas + análise por IA',
    valor: 79.90,
    periodo: 'mensal',
  },
  {
    id: 'mestre',
    titulo: 'Plano Mestre',
    descricao: 'Tudo + 1 consulta ao vivo por mês com oraculista',
    valor: 199.90,
    periodo: 'mensal',
  },
];

export const MercadoPagoServico = {
  /**
   * Cria uma preferência de pagamento no Mercado Pago.
   * Retorna a init_point (URL do checkout) para abrir no browser/WebView.
   *
   * ATENÇÃO: Em produção, esta chamada deve ser feita pelo backend
   * (Supabase Edge Function) para proteger o access_token.
   * Esta versão é para desenvolvimento/testes apenas.
   */
  async criarPreferencia(plano: PlanoMP, usuarioEmail: string, usuarioId: string) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken || accessToken === 'SEU_ACCESS_TOKEN_MP_AQUI') {
      throw new Error('Configure o MERCADOPAGO_ACCESS_TOKEN no arquivo .env');
    }

    const payload = {
      items: [
        {
          id: plano.id,
          title: plano.titulo,
          description: plano.descricao,
          quantity: 1,
          unit_price: plano.valor,
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: usuarioEmail,
      },
      back_urls: {
        success: `oraculovivo://pagamento/sucesso?plano=${plano.id}&usuario=${usuarioId}`,
        failure: `oraculovivo://pagamento/falha`,
        pending: `oraculovivo://pagamento/pendente`,
      },
      auto_return: 'approved',
      external_reference: `${usuarioId}__${plano.id}__${Date.now()}`,
      metadata: {
        usuario_id: usuarioId,
        plano_id: plano.id,
      },
    };

    const { data } = await axios.post(
      `${MP_API}/checkout/preferences`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      preferenceId: data.id as string,
      checkoutUrl: data.init_point as string,
      sandboxUrl: data.sandbox_init_point as string,
    };
  },

  /**
   * Verifica o status de um pagamento pelo ID.
   */
  async verificarPagamento(paymentId: string) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const { data } = await axios.get(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      status: data.status as 'approved' | 'pending' | 'rejected',
      statusDetalhe: data.status_detail as string,
      valor: data.transaction_amount as number,
      referencia: data.external_reference as string,
    };
  },
};
