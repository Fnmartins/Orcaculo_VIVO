import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { useAuth } from '../../contexts/AuthContext';
import {
  apagarVoto, listarAmostras, listarVotos, resumirGeral, resumirVotos, salvarVoto,
  type AmostraVoz, type VotoVoz,
} from '../../services/vozes';
import { mostrarAlerta } from '../../utils/alerta';

/**
 * Ouvir as vozes candidatas e dar nota, dentro do Painel.
 *
 * Mora aqui, e não numa página de fora, pelo motivo que o `index.tsx` deste
 * diretório já registrava sobre a prévia da mesa de búzios: decidir por link
 * que o sócio não abre é o mesmo que não mostrar nada. A votação só vale se as
 * duas pessoas conseguirem votar de onde já estão logadas.
 *
 * Cada um vê a própria nota nas estrelas e a do outro ao lado. O pódio em cima
 * é a leitura rápida: média, e quantos votaram.
 */

const ESTRELAS = [1, 2, 3, 4, 5];

export function ComparadorVozes() {
  const { sessao, perfil } = useAuth();
  const meuId = sessao?.user?.id ?? null;
  const meuNome = (perfil?.nome ?? '').trim() || sessao?.user?.email || 'Você';

  const [amostras, setAmostras] = useState<AmostraVoz[] | null>(null);
  const [votos, setVotos] = useState<VotoVoz[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [tocando, setTocando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  // O som fica numa ref, e não no estado: trocar de faixa não pode depender de
  // um novo render para descarregar o anterior, senão dois tocam juntos.
  const som = useRef<Audio.Sound | null>(null);

  const pararSom = useCallback(async () => {
    const atual = som.current;
    som.current = null;
    setTocando(null);
    if (atual) {
      try {
        await atual.unloadAsync();
      } catch {
        // Já descarregado, ou a tela saiu antes. Não há o que fazer nem o que
        // dizer: o objetivo era o som parar, e ele parou.
      }
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarAmostras(), listarVotos()])
      .then(([listaAmostras, listaVotos]) => {
        if (!vivo) return;
        setAmostras(listaAmostras);
        setVotos(listaVotos);
      })
      .catch(() => {
        if (!vivo) return;
        setErro('Não foi possível carregar as amostras de voz.');
        setAmostras([]);
      });
    return () => { vivo = false; };
  }, []);

  // Sair da tela com áudio tocando deixaria a voz falando por cima do resto do
  // Painel, sem nada visível para pausá-la.
  useEffect(() => () => { void pararSom(); }, [pararSom]);

  async function alternarSom(amostra: AmostraVoz) {
    if (tocando === amostra.id) {
      await pararSom();
      return;
    }
    await pararSom();
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: amostra.url }, { shouldPlay: true });
      som.current = sound;
      setTocando(amostra.id);
      sound.setOnPlaybackStatusUpdate((estado) => {
        if ('didJustFinish' in estado && estado.didJustFinish) void pararSom();
      });
    } catch {
      mostrarAlerta('Não deu para tocar', 'A amostra não carregou. Tente de novo.');
      await pararSom();
    }
  }

  async function votar(amostra: AmostraVoz, nota: number) {
    if (!meuId) return;
    const minhaAtual = votos.find((v) => v.voz === amostra.id && v.usuario_id === meuId);
    const limpar = minhaAtual?.nota === nota;

    // Mexe na tela primeiro; se a gravação falhar, volta ao que era. Estrela
    // que só acende depois da rede parece quebrada.
    const antes = votos;
    setVotos((atual) => {
      const semAMinha = atual.filter((v) => !(v.voz === amostra.id && v.usuario_id === meuId));
      return limpar
        ? semAMinha
        : [...semAMinha, { voz: amostra.id, usuario_id: meuId, autor_nome: meuNome, nota }];
    });
    setSalvando(amostra.id);
    try {
      if (limpar) await apagarVoto(amostra.id, meuId);
      else await salvarVoto(amostra.id, meuId, meuNome, nota);
    } catch (e) {
      setVotos(antes);
      mostrarAlerta('Não foi possível salvar', e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(null);
    }
  }

  if (!amostras) {
    return <ActivityIndicator style={{ marginVertical: Espacamento.lg }} color={Cores.acento} />;
  }

  if (erro) return <Text style={estilos.erro}>{erro}</Text>;

  if (amostras.length === 0) {
    return (
      <Text style={estilos.erro}>
        Nenhuma amostra no bucket de vozes ainda. Depois de enviar os arquivos elas
        aparecem aqui sozinhas — a lista é o próprio bucket.
      </Text>
    );
  }

  const podio = resumirVotos(votos).slice(0, 5);
  const nomePorId = new Map(amostras.map((a) => [a.id, `${a.nome} (${a.marca})`]));
  const geral = resumirGeral(votos, amostras.length);

  // Quem participa da decisão: eu, mais todo mundo que já votou em qualquer
  // voz. É essa lista que permite mostrar "—" para quem ainda não ouviu uma
  // voz — sem ela, quem não votou some da tela e fica igual a nota em branco.
  const participantes = [
    ...(meuId ? [{ usuario_id: meuId, nome: 'Você' }] : []),
    ...geral.porPessoa
      .filter((p) => p.usuario_id !== meuId)
      // Voto gravado antes de o nome passar a ser guardado não tem autor. Com
      // duas pessoas decidindo, "o outro" é exato; assim que essa pessoa votar
      // de novo em qualquer voz, o nome dela aparece.
      .map((p) => ({ usuario_id: p.usuario_id, nome: p.nome || 'o outro' })),
  ];

  const notaDe = (voz: string, usuarioId: string) =>
    votos.find((v) => v.voz === voz && v.usuario_id === usuarioId)?.nota ?? null;

  return (
    <View style={estilos.bloco}>
      <Text style={estilos.ajuda}>
        Todas leem o mesmo trecho. Dê de 1 a 5 estrelas; clicar de novo na mesma
        estrela limpa a sua nota. Cada um vê a nota do outro ao lado.
      </Text>

      {geral.porPessoa.length > 0 ? (
        <View style={estilos.resumo}>
          <Text style={estilos.rotulo}>Onde a decisão está</Text>
          {geral.porPessoa.map((p) => (
            <Text key={p.usuario_id} style={estilos.resumoLinha}>
              {`${p.usuario_id === meuId ? 'Você' : (p.nome || 'o outro')}: ${p.quantas} de ${geral.totalVotado} vozes`}
            </Text>
          ))}
          <Text style={estilos.resumoDestaque}>
            {participantes.length < 2
              ? 'Só você votou até agora. Falta o outro entrar no Painel para a média valer.'
              : `${geral.ouvidasPorTodos} ${geral.ouvidasPorTodos === 1 ? 'voz tem' : 'vozes têm'} nota dos dois — é entre elas que dá para decidir.`}
          </Text>
        </View>
      ) : null}

      {podio.length > 0 ? (
        <View style={estilos.podio}>
          <Text style={estilos.rotulo}>Mais bem votadas</Text>
          <Text style={estilos.podioAjuda}>
            Ordenado por quantos votaram primeiro, média depois: uma voz que só
            uma pessoa ouviu ainda não é candidata.
          </Text>
          {podio.map((p, i) => (
            <View key={p.voz} style={estilos.podioItem}>
              <View style={estilos.podioLinha}>
                <Text style={estilos.podioPos}>{i + 1}</Text>
                <Text style={estilos.podioNome}>{nomePorId.get(p.voz) ?? p.voz}</Text>
                <Text style={estilos.podioMedia}>{p.media.toFixed(1)}</Text>
              </View>
              <Text style={estilos.podioDetalhe}>
                {participantes
                  .map((quem) => {
                    const nota = notaDe(p.voz, quem.usuario_id);
                    return `${quem.nome} ${nota ?? '—'}`;
                  })
                  .join('   ·   ')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {amostras.map((a) => {
        const minha = meuId ? notaDe(a.id, meuId) ?? 0 : 0;
        const outros = participantes.filter((p) => p.usuario_id !== meuId);

        return (
          <View key={a.id} style={estilos.voz}>
            <Pressable
              onPress={() => { void alternarSom(a); }}
              accessibilityRole="button"
              accessibilityLabel={tocando === a.id ? `Parar ${a.nome}` : `Ouvir ${a.nome}`}
              style={[estilos.tocar, tocando === a.id && estilos.tocando]}
            >
              <Ionicons
                name={tocando === a.id ? 'pause' : 'play'}
                size={16}
                color={Cores.superficie}
              />
            </Pressable>

            <View style={estilos.identidade}>
              <Text style={estilos.nome}>{a.nome}</Text>
              <Text style={estilos.marca}>{a.marca}</Text>
            </View>

            <View style={estilos.estrelas}>
              {ESTRELAS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => { void votar(a, n); }}
                  disabled={!meuId || salvando === a.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} de 5 para ${a.nome}`}
                  hitSlop={4}
                >
                  <Text style={[estilos.estrela, !meuId && estilos.estrelaTravada]}>
                    {n <= minha ? '★' : '☆'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Antes aqui só saíam os números dos outros, e quem não tinha
                votado aparecia em branco — igualzinho a quem votou zero. O
                nome com o travessão é o que separa "não gostou" de "nem
                ouviu". */}
            <View style={estilos.outros}>
              {outros.length === 0 ? (
                <Text style={estilos.outroVazio}>só você</Text>
              ) : (
                outros.map((quem) => {
                  const nota = notaDe(a.id, quem.usuario_id);
                  return (
                    <Text key={quem.usuario_id} style={estilos.outroLinha}>
                      <Text style={estilos.outroNome}>{`${quem.nome} `}</Text>
                      <Text style={nota === null ? estilos.outroFalta : estilos.outroNota}>
                        {nota === null ? '—' : String(nota)}
                      </Text>
                    </Text>
                  );
                })
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: Espacamento.xs },
  ajuda: {
    fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario,
    marginBottom: Espacamento.xs,
  },
  erro: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.erro },
  rotulo: {
    fontFamily: Fontes.corpoSemibold, fontSize: 11, letterSpacing: 1.2,
    textTransform: 'uppercase', color: Cores.acento, marginBottom: 4,
  },
  podio: {
    backgroundColor: Cores.cardFundo, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda,
    padding: Espacamento.sm, marginBottom: Espacamento.sm, gap: 3,
  },
  podioAjuda: {
    fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario,
    marginBottom: 6, lineHeight: 15,
  },
  podioItem: { marginBottom: 5 },
  podioLinha: { flexDirection: 'row', alignItems: 'baseline', gap: Espacamento.xs },
  podioPos: { fontFamily: Fontes.corpoNegrito, fontSize: 13, color: Cores.acento, width: 16 },
  podioNome: { flex: 1, fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoClaro },
  podioMedia: { fontFamily: Fontes.corpoNegrito, fontSize: 13, color: Cores.acento },
  podioDetalhe: {
    fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario,
    marginLeft: 16 + Espacamento.xs,
  },
  resumo: {
    backgroundColor: Cores.cardFundo, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda,
    padding: Espacamento.sm, marginBottom: Espacamento.sm, gap: 2,
  },
  resumoLinha: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoClaro },
  resumoDestaque: {
    fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.acento, marginTop: 4,
  },
  voz: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    backgroundColor: Cores.cardFundo, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda,
    paddingHorizontal: Espacamento.sm, paddingVertical: 8, marginBottom: 6,
  },
  tocar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Cores.primaria,
    alignItems: 'center', justifyContent: 'center',
  },
  tocando: { backgroundColor: Cores.acento },
  identidade: { flex: 1, minWidth: 0 },
  nome: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoClaro },
  marca: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario },
  estrelas: { flexDirection: 'row', gap: 1 },
  estrela: { fontSize: 18, color: Cores.acento, paddingHorizontal: 1 },
  estrelaTravada: { opacity: 0.4 },
  outros: { minWidth: 62, alignItems: 'flex-end' },
  outroLinha: { fontSize: 11, lineHeight: 15 },
  outroNome: { fontFamily: Fontes.corpo, color: Cores.textoSecundario },
  outroNota: { fontFamily: Fontes.corpoNegrito, color: Cores.acento, fontSize: 12 },
  outroFalta: { fontFamily: Fontes.corpo, color: Cores.textoSecundario },
  outroVazio: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario },
});
