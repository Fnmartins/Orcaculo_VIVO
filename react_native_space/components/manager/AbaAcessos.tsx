import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { useAuth } from '../../contexts/AuthContext';
import { definirAdmin, listarUsuarios } from '../../services/acessos';
import { ehAcessoNegado } from '../../services/acessoNegado';
import { ehSessaoExpirada } from '../../services/sessaoExpirada';
import { filtrarUsuarios, ROTULO_PLANO, type UsuarioAcesso } from '../../utils/acessos';
import { confirmarAcao, mostrarAlerta } from '../../utils/alerta';
import { EstadoCarregamento } from './EstadoCarregamento';
import { irParaLoginPorSessaoExpirada } from './sessao';
import { estilosPainel } from './estilos';
import type { PropsAbaManager } from './tipos';

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function AbaAcessos({ aoPerderAcesso }: PropsAbaManager) {
  const { sessao } = useAuth();
  const meuId = sessao?.user?.id;
  const [usuarios, setUsuarios] = useState<UsuarioAcesso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [termo, setTermo] = useState('');
  const [alterando, setAlterando] = useState<string | null>(null);

  // Quantos existem no banco, contra quantos já estão na tela. A lista vinha
  // cortada em mil linhas sem avisar; agora vem por página, e a tela diz quanto
  // falta em vez de mentir por omissão.
  const [total, setTotal] = useState(0);
  const [carregandoMais, setCarregandoMais] = useState(false);
  // Conta páginas, e não linhas divididas por um tamanho: o tamanho da página é do
  // servidor, e repeti-lo aqui criaria duas versões do mesmo número — que um dia
  // divergem e fazem a paginação pular gente.
  const [proximaPagina, setProximaPagina] = useState(1);

  /** Trata o erro pelo que ele significa. Devolve true quando já tratou. */
  const tratarErro = useCallback((e: unknown): boolean => {
    if (ehSessaoExpirada(e)) {
      irParaLoginPorSessaoExpirada();
      return true;
    }
    if (ehAcessoNegado(e)) {
      aoPerderAcesso();
      return true;
    }
    return false;
  }, [aoPerderAcesso]);

  const carregar = useCallback(() => {
    setErro(null);
    listarUsuarios(0)
      .then((pagina) => {
        setUsuarios(pagina.usuarios);
        setTotal(pagina.total);
        setProximaPagina(1);
      })
      .catch((e) => {
        if (tratarErro(e)) return;
        setErro('Não foi possível carregar os usuários.');
      });
  }, [tratarErro]);

  /**
   * A página seguinte, acrescentada ao que já está na tela.
   *
   * Acrescentar em vez de trocar de página é de propósito: a busca por nome e
   * e-mail acontece aqui, sobre o que está carregado. Trocar de página faria a
   * busca ver só uma fatia, e o Painel diria "ninguém encontrado" sobre alguém que
   * existe.
   */
  const carregarMais = useCallback(() => {
    setCarregandoMais(true);
    listarUsuarios(proximaPagina)
      .then((pagina) => {
        setTotal(pagina.total);
        setProximaPagina((n) => n + 1);
        setUsuarios((atuais) => {
          const conhecidos = new Set((atuais ?? []).map((u) => u.id));
          // Filtra repetido: se alguém se cadastrar entre dois pedidos, a ordem por
          // data empurra uma linha para a página seguinte e ela voltaria duplicada,
          // com chave repetida na lista.
          return [...(atuais ?? []), ...pagina.usuarios.filter((u) => !conhecidos.has(u.id))];
        });
      })
      .catch((e) => {
        if (tratarErro(e)) return;
        setErro('Não foi possível carregar mais usuários.');
      })
      .finally(() => setCarregandoMais(false));
  }, [proximaPagina, tratarErro]);

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
      <Text style={estilosPainel.ajuda}>
        {`${visiveis.length} de ${usuarios.length} carregados`}
        {total > usuarios.length ? ` · ${total} no total` : ''}
      </Text>
      {visiveis.length === 0 ? <Text style={estilosPainel.ajuda}>Nenhum usuário encontrado.</Text> : null}
      {/* Dito em voz alta quando a busca não viu todo mundo. Antes a lista vinha
          cortada em silêncio, e "nenhum usuário encontrado" podia ser mentira. */}
      {termo && total > usuarios.length ? (
        <Text style={estilosPainel.ajuda}>
          {`A busca procura entre os ${usuarios.length} já carregados. Carregue mais para alcançar o resto.`}
        </Text>
      ) : null}

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
      {/* O erro de carregar mais precisa aparecer AQUI: `EstadoCarregamento` só
          existe enquanto a lista está vazia, e sem esta linha a mensagem era
          gravada num estado que ninguém mostrava — o botão simplesmente não fazia
          nada, sem explicação. */}
      {erro && usuarios.length > 0 ? <Text style={estilosPainel.ajuda}>{erro}</Text> : null}

      {total > usuarios.length ? (
        <Pressable
          onPress={carregarMais}
          disabled={carregandoMais}
          accessibilityRole="button"
          accessibilityLabel={`Carregar mais usuários, ${total - usuarios.length} restantes`}
          accessibilityState={{ disabled: carregandoMais }}
          style={[estilosPainel.botaoSecundario, carregandoMais && estilosPainel.botaoDesabilitado]}
        >
          <Text style={estilosPainel.botaoSecundarioTexto}>
            {carregandoMais
              ? 'Carregando…'
              : `Carregar mais (${total - usuarios.length} restantes)`}
          </Text>
        </Pressable>
      ) : null}
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
