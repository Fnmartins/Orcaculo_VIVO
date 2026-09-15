// @ts-nocheck
import {
  validarMudancaAdmin,
  ERRO_REMOVER_SI_MESMO,
  ERRO_ULTIMO_ADMIN,
} from '../../supabase/functions/_shared/regras-acessos';

const base = { solicitanteId: 'eu', alvoId: 'outro', alvoEhAdmin: true, totalAdmins: 2 };

describe('validarMudancaAdmin', () => {
  it('permite promover alguém', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: true, alvoEhAdmin: false })).toEqual({ ok: true });
  });

  it('permite remover outro admin quando sobra pelo menos um', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false })).toEqual({ ok: true });
  });

  it('recusa remover o próprio acesso', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false, alvoId: 'eu' }))
      .toEqual({ ok: false, erro: ERRO_REMOVER_SI_MESMO });
  });

  it('recusa remover o último admin', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false, totalAdmins: 1 }))
      .toEqual({ ok: false, erro: ERRO_ULTIMO_ADMIN });
  });

  it('é idempotente: promover quem já é admin e rebaixar quem não é passam', () => {
    expect(validarMudancaAdmin({ ...base, tornarAdmin: true })).toEqual({ ok: true });
    expect(validarMudancaAdmin({ ...base, tornarAdmin: false, alvoEhAdmin: false, totalAdmins: 1 }))
      .toEqual({ ok: true });
  });
});
