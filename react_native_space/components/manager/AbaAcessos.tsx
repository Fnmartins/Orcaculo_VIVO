import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { useAuth } from '../../contexts/AuthContext';
import { definirAdmin, listarUsuarios } from '../../services/acessos';
import { ehAcessoNegado } from '../../services/acessoNegado';
import { ehSessaoExpirada, MENSAGEM_SESSAO_EXPIRADA } from '../../services/sessaoExpirada';
import { filtrarUsuarios, ROTULO_PLANO, type UsuarioAcesso } from '../../utils/acessos';
import { confirmarAcao, mostrarAlerta } from '../../utils/alerta';
import { EstadoCarregamento } from './EstadoCarregamento';
import { estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function irParaLoginPorSessaoExpirada() {
  mostrarAlerta('Sessão expirada', MENSAGEM_SESSAO_EXPIRADA);
  router.replace('/auth/login');
}

export function AbaAcessos({ aoPerderAcesso }: PropsAbaManager) {
  const { sessao } = useAuth();
  const meuId = sessao?.user?.id;
  const [usuarios, setUsuarios] = useState<UsuarioAcesso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [termo, setTermo] = useState('');
  const [alterando, setAlterando] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setErro(null);
    listarUsuarios()
      .then(setUsuarios)
      .catch((e) => {
        if (ehSessaoExpirada(e)) {
          irParaLoginPorSessaoExpirada();
          return;
        }
        if (ehAcessoNegado(e)) {
          aoPerderAcesso();
          return;
        }
        setErro('Não foi possível carregar os usuários.');
      });
  }, [aoPerderAcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = useMemo(() => filtrarUsuarios(usuarios ?? [], termo), [usuarios, termo]);

  async function aplicar(u: UsuarioAcesso, admin: boolean) {
    setAlterando(u.id);
    try {
      await definirAdmin(u.id, admin);
      carregar();
    } catch (e) {
      if (ehSessaoExpirada(e)) {
        irParaLoginPorSessaoExpirada();
        return;
      }
      if (ehAcessoNegado(e)) {
        aoPerderAcesso();
        return;
      }
      mostrarAlerta('Não foi possível alterar', e instanceof Error ? e.message : String(e));
    } finally {
      setAlterando(null);
    }
  }

  function pedirMudanca(u: UsuarioAcesso) {
    const nome = u.nome ?? u.email ?? 'Esta pessoa';
    if (u.is_super_admin) {
      confirmarAcao(
        'Remover admin',
        `${nome} deixa de abrir o Painel e passa a seguir as regras do próprio plano.`,
        () => aplicar(u, false),
        { confirmarLabel: 'Remover admin', destrutivo: true },
      );
    } else {
      confirmarAcao(
        'Tornar admin',
        `${nome} poderá alterar preços na Stripe e usará todos os recursos sem pagar.`,
        () => aplicar(u, true),
        { confirmarLabel: 'Tornar admin' },
      );
    }
  }

  if (!usuarios) return <EstadoCarregamento erro={erro} aoTentarDeNovo={carregar} />;

  return (
    <ScrollView contentContainerStyle={estilosPainel.conteudo} keyboardShouldPersistTaps="handled">
      <TextInput
        style={estilosPainel.input}
        value={termo}
        onChangeText={setTermo}
        placeholder="Buscar por nome ou e-mail"
        placeholderTextColor={Cores.textoSecundario}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Buscar usuário"
      />
      <Text style={estilosPainel.ajuda}>{`${visiveis.length} de ${usuarios.length} usuários`}</Text>
      {visiveis.length === 0 ? <Text style={estilosPainel.ajuda}>Nenhum usuário encontrado.</Text> : null}

      {visiveis.map((u) => {
        const ehVoce = u.id === meuId;
        const nome = u.nome ?? u.email ?? 'Sem nome';
        const acao = u.is_super_admin ? 'Remover admin' : 'Tornar admin';
        const desabilitado = ehVoce || alterando !== null;
        return (
          <View key={u.id} style={estilosPainel.card}>
            <View style={estilos.topo}>
              <Text style={[estilosPainel.titulo, estilos.nome]}>{nome}</Text>
              {u.is_super_admin ? <Text style={estilos.selo}>Admin</Text> : null}
            </View>
            {u.nome && u.email ? <Text style={estilosPainel.ajuda}>{u.email}</Text> : null}
            <Text style={estilosPainel.ajuda}>
              {`Cadastro em ${formatarData(u.criado_em)} · Plano ${ROTULO_PLANO[u.plano] ?? u.plano}`}
            </Text>
            <View style={estilos.rodapeCard}>
              {ehVoce ? <Text style={estilosPainel.ajuda}>você</Text> : null}
              <Pressable
                onPress={() => pedirMudanca(u)}
                disabled={desabilitado}
                accessibilityRole="button"
                accessibilityLabel={`${acao} de ${nome}`}
                accessibilityState={{ disabled: desabilitado }}
                style={[
                  u.is_super_admin ? estilosPainel.botaoSecundario : estilosPainel.botao,
                  desabilitado && estilosPainel.botaoDesabilitado,
                ]}
              >
                <Text style={u.is_super_admin ? estilosPainel.botaoSecundarioTexto : estilosPainel.botaoTexto}>
                  {alterando === u.id ? 'Salvando…' : acao}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <View style={estilos.rodape} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm },
  nome: { flex: 1 },
  selo: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 11,
    color: '#fff',
    backgroundColor: Cores.primaria,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RaioBorda.full,
    overflow: 'hidden',
  },
  rodapeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Espacamento.sm,
    marginTop: Espacamento.xs,
  },
  rodape: { height: 48 },
});
