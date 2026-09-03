// Edge Function: enviar-boas-vindas
// Envia o e-mail de boas-vindas do Arcanus DEPOIS que o usuario confirma
// a conta. E invocada pelo trigger SQL `ao_confirmar_email` (ver
// supabase/welcome-email/setup.sql), que so dispara na transicao
// email_confirmed_at NULL -> preenchido.
//
// Seguranca: aceita apenas chamadas com o header x-webhook-secret correto
// (segredo compartilhado com o trigger). Deploy com --no-verify-jwt, pois o
// trigger chama sem JWT de usuario.
//
// Idempotencia: marca perfis.boas_vindas_enviada = true apos enviar; se ja
// estiver true, nao reenvia.
//
// Secrets necessarios (supabase secrets set ...):
//   RESEND_API_KEY          -> API key do Resend (re_...)
//   WELCOME_HOOK_SECRET     -> mesmo segredo usado no trigger SQL
//   REMETENTE_EMAIL         -> remetente verificado no Resend (ex.: contato@seudominio.com)
//   REMETENTE_NOME          -> opcional (default "Arcanus")
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao injetados automaticamente
// pelo runtime das Edge Functions.

import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API = 'https://api.resend.com/emails';

function json(status: number, body: Record<string, unknown> = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function corpoEmail(primeiroNome: string | null): string {
  const saudacao = primeiroNome
    ? `Sua conta está ativa, ${primeiroNome} — o <strong style="color:#587565;">Arcanus</strong> já te reconhece. ✨`
    : `Sua conta está ativa e o <strong style="color:#587565;">Arcanus</strong> já te reconhece. ✨`;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light"><title>Bem-vindo(a) ao Arcanus</title></head>
<body style="margin:0; padding:0; background-color:#F7F3EA;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#F7F3EA; font-size:1px; line-height:1px;">Sua conta está ativa. O Arcanus está pronto para caminhar com você.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F3EA;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FFFCF6; border-radius:18px; overflow:hidden; border:1px solid #DED9CC;">
      <tr><td align="center" style="background-color:#24312D; padding:36px 24px 30px 24px;">
        <div style="font-family:Georgia,'Times New Roman',serif; font-size:13px; letter-spacing:5px; color:#C5A365; text-transform:uppercase;">✦ &nbsp;Arcanus&nbsp; ✦</div>
        <div style="font-family:Georgia,'Times New Roman',serif; font-size:26px; line-height:1.3; color:#F7F3EA; margin-top:14px;">Sua jornada começou 🌙</div>
      </td></tr>
      <tr><td style="padding:36px 40px 12px 40px; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:#24312D;">${saudacao}</p>
        <p style="margin:0 0 8px 0; font-size:16px; line-height:1.6; color:#59665F;">A partir de agora você pode explorar:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 8px 0;">
          <tr><td style="padding:4px 0; font-size:15px; line-height:1.6; color:#24312D;">🔮&nbsp;&nbsp;Tarô e leitura das cartas</td></tr>
          <tr><td style="padding:4px 0; font-size:15px; line-height:1.6; color:#24312D;">🐚&nbsp;&nbsp;Jogo de búzios</td></tr>
          <tr><td style="padding:4px 0; font-size:15px; line-height:1.6; color:#24312D;">🔢&nbsp;&nbsp;Numerologia e matriz do destino</td></tr>
          <tr><td style="padding:4px 0; font-size:15px; line-height:1.6; color:#24312D;">🌌&nbsp;&nbsp;Mapa astral e leitura do dia</td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:14px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" style="border-radius:999px; background-color:#B58B46;">
            <a href="https://arcanus.com.br" target="_blank" style="display:inline-block; padding:15px 40px; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; font-size:16px; font-weight:600; color:#FFFCF6; text-decoration:none; border-radius:999px;">Abrir o Arcanus</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px 40px 0 40px;"><div style="height:1px; background-color:#DED9CC; line-height:1px; font-size:1px;">&nbsp;</div></td></tr>
      <tr><td style="padding:20px 40px 34px 40px; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <p style="margin:0; font-size:12px; line-height:1.6; color:#B0A9A0;">Que a sua jornada seja luminosa. — equipe do Arcanus 🌙</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { erro: 'metodo' });

  // Autenticacao por segredo compartilhado com o trigger.
  const segredo = Deno.env.get('WELCOME_HOOK_SECRET');
  if (!segredo || request.headers.get('x-webhook-secret') !== segredo) {
    return json(401, { erro: 'nao autorizado' });
  }

  try {
    const body = await request.json().catch(() => ({})) as {
      id?: string;
      email?: string;
      nome?: string | null;
    };
    const id = body.id?.trim();
    const email = body.email?.trim();
    if (!id || !email) return json(400, { erro: 'id/email ausentes' });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const remetenteEmail = Deno.env.get('REMETENTE_EMAIL');
    const remetenteNome = Deno.env.get('REMETENTE_NOME') ?? 'Arcanus';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // Inerte enquanto Resend/remetente nao estiverem configurados.
    if (!resendKey || !remetenteEmail || !supabaseUrl || !serviceRoleKey) {
      console.warn('boas-vindas: configuracao incompleta, nada enviado');
      return json(503, { erro: 'configuracao incompleta' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Idempotencia: so envia se ainda nao foi enviado.
    const { data: perfil, error: erroBusca } = await supabaseAdmin
      .from('perfis')
      .select('nome, boas_vindas_enviada')
      .eq('id', id)
      .maybeSingle();
    if (erroBusca) return json(500, { erro: 'perfil' });
    if (perfil?.boas_vindas_enviada) return json(200, { ok: true, ja_enviado: true });

    const nomeCompleto = (body.nome ?? perfil?.nome ?? '').trim();
    const primeiroNome = nomeCompleto ? nomeCompleto.split(/\s+/)[0] : null;

    const respostaResend = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${remetenteNome} <${remetenteEmail}>`,
        to: [email],
        subject: 'Bem-vindo(a) ao Arcanus 🌙',
        html: corpoEmail(primeiroNome),
      }),
    });
    if (!respostaResend.ok) {
      const detalhe = await respostaResend.text().catch(() => '');
      console.error('boas-vindas: Resend falhou', respostaResend.status, detalhe);
      return json(502, { erro: 'resend' });
    }

    // Marca como enviado (idempotencia).
    await supabaseAdmin
      .from('perfis')
      .update({ boas_vindas_enviada: true })
      .eq('id', id);

    return json(200, { ok: true });
  } catch (erro) {
    console.error('boas-vindas: erro', erro instanceof Error ? erro.message : erro);
    return json(500, { erro: 'interno' });
  }
});
