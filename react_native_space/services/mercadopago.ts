import { supabase } from './supabase';

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
  async criarPreferencia(plano: PlanoMP) {
    const { data, error } = await supabase.functions.invoke('criar-preferencia', {
      body: { planoId: plano.id },
    });

    if (error) throw new Error('Pagamento temporariamente indisponível. Tente novamente.');
    if (!data?.checkoutUrl || !data?.preferenceId) {
      throw new Error(data?.erro ?? 'Resposta inválida do serviço de pagamento.');
    }

    return {
      preferenceId: data.preferenceId as string,
      checkoutUrl: data.checkoutUrl as string,
    };
  },
};
