// supabase/functions/_shared/config-planos.ts
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { PlanoId } from './planos.ts';

export interface ConfigPlanoRow {
  id: PlanoId;
  cota_consultas: number;
  preco_brl: number;
  preco_usd: number;
  preco_eur: number;
  preco_cad: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

// Lê a linha de config_planos com service role (bypassa RLS).
export async function lerConfigPlano(
  admin: SupabaseClient,
  planoId: PlanoId,
): Promise<ConfigPlanoRow | null> {
  const { data, error } = await admin
    .from('config_planos')
    .select(
      'id, cota_consultas, preco_brl, preco_usd, preco_eur, preco_cad, stripe_product_id, stripe_price_id',
    )
    .eq('id', planoId)
    .maybeSingle();
  if (error) throw error;
  return (data as ConfigPlanoRow | null) ?? null;
}
