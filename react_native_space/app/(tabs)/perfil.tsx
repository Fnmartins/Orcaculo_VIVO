import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { confirmarAcao } from '../../utils/alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { GradientBackground } from '../../components/GradientBackground';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { Hapticos } from '../../utils/haptics';
import { useAuth } from '../../contexts/AuthContext';
import { AuthServico } from '../../services/auth';
import { supabase } from '../../services/supabase';

const NOMES_PLANO: Record<string, string> = {
  gratuito: 'Plano Gratuito',
  iniciante: 'Plano Iniciante',
  explorador: 'Plano Explorador',
  mestre: 'Plano Mestre',
  _super_admin: 'Pro (Super Admin)',
};

const PRECOS_PLANO: Record<string, string> = {
  gratuito: 'Grátis',
  iniciante: 'R$ 29,90/mês',
  explorador: 'R$ 79,90/mês',
  mestre: 'R$ 199,90/mês',
};

interface MenuItemProps {
  icone: string;
  iconeLib?: 'ionicons' | 'material';
  titulo: string;
  subtitulo?: string;
  cor?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  perigo?: boolean;
  emBreve?: boolean;
}

export default function TelaPerfil() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [notificacoes, setNotificacoes] = useState(true);
  const [leituraDiaria, setLeituraDiaria] = useState(true);
  const [somHapticos, setSomHapticos] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(true);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeInput, setNomeInput] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const { sessao, perfil, carregando, recarregarPerfil, atualizarPerfil } = useAuth();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const iniciais = useCallback(() => {
    const nome = perfil?.nome ?? sessao?.user?.email ?? '?';
    return nome.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
  }, [perfil, sessao]);

  const diasRestantes = useCallback(() => {
    if (!perfil?.plano_valido_ate) return null;
    const diff = new Date(perfil.plano_valido_ate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [perfil]);

  const membroDesde = useCallback(() => {
    if (!perfil?.criado_em) return '';
    const d = new Date(perfil.criado_em);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  }, [perfil]);

  const abrirEditarNome = useCallback(() => {
    setNomeInput(perfil?.nome ?? sessao?.user?.email?.split('@')[0] ?? '');
    setEditandoNome(true);
    Hapticos.impactoLeve();
  }, [perfil, sessao]);

  const salvarNome = useCallback(async () => {
    const nome = nomeInput.trim();
    if (!nome) return;
    setSalvandoNome(true);
    try {
      await atualizarPerfil({ nome });
      setEditandoNome(false);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar o nome. Tente novamente.');
    } finally {
      setSalvandoNome(false);
    }
  }, [nomeInput, atualizarPerfil]);

  const alterarFoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para alterar sua foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]) return;
    if (!sessao?.user?.id) return;

    setEnviandoFoto(true);
    Hapticos.impactoLeve();
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `avatar_${sessao.user.id}.${ext}`;

      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: `image/${ext}` } as any);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await AuthServico.atualizarPerfil(sessao.user.id, { avatar_url: urlData.publicUrl });
      await recarregarPerfil();
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível alterar a foto. Tente novamente.');
    } finally {
      setEnviandoFoto(false);
    }
  }, [sessao, recarregarPerfil]);

  const sair = useCallback(() => {
    Hapticos.impactoMedio();
    confirmarAcao(
      'Sair da Conta',
      'Tem certeza que deseja sair?',
      async () => {
        await AuthServico.sair();
        router.replace('/welcome');
      },
      { confirmarLabel: 'Sair', destrutivo: true },
    );
  }, []);

  const nomeExibido = perfil?.nome ?? sessao?.user?.email?.split('@')[0] ?? 'Buscador de Luz';

  if (carregando) {
    return (
      <GradientBackground>
        <SafeAreaView style={estilos.safeArea} edges={['top']}>
          <View style={estilos.loadingContainer}>
            <ActivityIndicator size="large" color={Cores.acento} />
            <Text style={estilos.loadingTexto}>Carregando perfil...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safeArea} edges={['top']}>
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={estilos.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={estilos.header}>
              <Text style={estilos.titulo}>Perfil</Text>
            </View>

            {/* Avatar & Info */}
            <View style={estilos.perfilCard}>
              <View style={estilos.avatarContainer}>
                {perfil?.avatar_url ? (
                  <Image source={{ uri: perfil.avatar_url }} style={estilos.avatarImagem} contentFit="cover" />
                ) : (
                  <LinearGradient colors={Cores.gradienteAcento} style={estilos.avatarGradiente}>
                    <Text style={estilos.avatarTexto}>{iniciais()}</Text>
                  </LinearGradient>
                )}
                <Pressable style={estilos.editarAvatar} onPress={alterarFoto} disabled={enviandoFoto}>
                  {enviandoFoto
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={14} color="#fff" />
                  }
                </Pressable>
              </View>
              <Pressable onPress={abrirEditarNome} style={estilos.nomeContainer}>
                <Text style={estilos.perfilNome}>{nomeExibido}</Text>
                <Ionicons name="pencil-outline" size={14} color={Cores.textoSecundario} style={estilos.nomeIconeEditar} />
              </Pressable>
              <Text style={estilos.perfilEmail}>{sessao?.user?.email ?? ''}</Text>
              <View style={estilos.perfilBadges}>
                <View style={estilos.badgeMembro}>
                  <Ionicons name="star" size={12} color={Cores.acento} />
                  <Text style={estilos.badgeMembroTexto}>
                    {perfil?.criado_em ? `Membro desde ${membroDesde()}` : 'Novo membro'}
                  </Text>
                </View>
                {(perfil?.nivel ?? 1) > 1 && (
                  <View style={[estilos.badgeMembro, { backgroundColor: 'rgba(75,0,130,0.15)', marginLeft: 8 }]}>
                    <MaterialCommunityIcons name="star-four-points" size={12} color="#B565A7" />
                    <Text style={[estilos.badgeMembroTexto, { color: '#B565A7' }]}>Nível {perfil?.nivel}</Text>
                  </View>
                )}
                {perfil?.is_super_admin && (
                  <View style={[estilos.badgeMembro, { backgroundColor: 'rgba(255,215,0,0.2)', marginLeft: 8 }]}>
                    <MaterialCommunityIcons name="shield-crown" size={12} color="#FFD700" />
                    <Text style={[estilos.badgeMembroTexto, { color: '#FFD700' }]}>Super Admin</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Plano Atual */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Meu Plano</Text>
              <Pressable
                onPress={() => { Hapticos.impactoLeve(); router.push('/planos'); }}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                <LinearGradient
                  colors={['rgba(212, 175, 55, 0.12)', 'rgba(75, 0, 130, 0.12)'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={estilos.planoCard}
                >
                  <View style={estilos.planoTop}>
                    <View style={estilos.planoIcone}>
                      <MaterialCommunityIcons name="crown" size={24} color={Cores.acento} />
                    </View>
                    <View style={estilos.planoInfo}>
                      <Text style={estilos.planoNome}>{perfil?.is_super_admin ? NOMES_PLANO._super_admin : NOMES_PLANO[perfil?.plano ?? 'gratuito']}</Text>
                      <Text style={estilos.planoPreco}>{perfil?.is_super_admin ? 'Acesso total' : PRECOS_PLANO[perfil?.plano ?? 'gratuito']}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Cores.textoSecundario} />
                  </View>
                  <View style={estilos.planoLimites}>
                    <View style={estilos.limiteItem}>
                      <Text style={estilos.limiteValor}>
                        {perfil?.plano === 'explorador' || perfil?.plano === 'mestre'
                          ? '∞' : (perfil?.consultas_restantes ?? 1)}
                      </Text>
                      <Text style={estilos.limiteLabel}>Leituras restantes</Text>
                    </View>
                    <View style={estilos.limiteDivisor} />
                    <View style={estilos.limiteItem}>
                      <Text style={estilos.limiteValor}>
                        {diasRestantes() !== null ? `${diasRestantes()} dias` : '—'}
                      </Text>
                      <Text style={estilos.limiteLabel}>Até renovar</Text>
                    </View>
                  </View>
                  {(perfil?.plano === 'gratuito' || perfil?.plano === 'iniciante') && (
                    <View style={estilos.upgradeRow}>
                      <Ionicons name="sparkles" size={14} color={Cores.acento} />
                      <Text style={estilos.upgradeTexto}>Faça upgrade para leituras ilimitadas</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Preferências Espirituais */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Preferências Espirituais</Text>
              <View style={estilos.menuGrupo}>
                <MenuItem
                  icone="compass-outline"
                  titulo="Caminhos Espirituais"
                  subtitulo={perfil?.caminho_espiritual ?? 'Não definido'}
                  emBreve
                />
                <MenuItem
                  icone="document-text-outline"
                  titulo="Formato de Entrega"
                  subtitulo="Texto"
                  emBreve
                />
                <MenuItem
                  icone="heart-outline"
                  titulo="Intenções"
                  subtitulo={perfil?.intencao ?? 'Não definido'}
                  emBreve
                />
                <MenuItem
                  icone="color-palette-outline"
                  titulo="Signo Solar"
                  subtitulo={perfil?.signo ?? 'Não definido'}
                  emBreve
                />
              </View>
            </View>

            {/* Notificações & Lembretes */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Notificações</Text>
              <View style={estilos.menuGrupo}>
                <MenuItem
                  icone="notifications-outline"
                  titulo="Notificações"
                  subtitulo="Receber alertas do app"
                  trailing={
                    <Switch
                      value={notificacoes}
                      onValueChange={(v) => { setNotificacoes(v); Hapticos.selecao(); }}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: Cores.acento + '60' }}
                      thumbColor={notificacoes ? Cores.acento : '#ccc'}
                    />
                  }
                />
                <MenuItem
                  icone="sunny-outline"
                  titulo="Leitura Diária"
                  subtitulo="Lembrete às 08:00"
                  trailing={
                    <Switch
                      value={leituraDiaria}
                      onValueChange={(v) => { setLeituraDiaria(v); Hapticos.selecao(); }}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: Cores.acento + '60' }}
                      thumbColor={leituraDiaria ? Cores.acento : '#ccc'}
                    />
                  }
                />
              </View>
            </View>

            {/* Configurações */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Configurações</Text>
              <View style={estilos.menuGrupo}>
                <MenuItem
                  icone="moon-outline"
                  titulo="Modo Escuro"
                  subtitulo="Tema do aplicativo"
                  trailing={
                    <Switch
                      value={modoEscuro}
                      onValueChange={(v) => { setModoEscuro(v); Hapticos.selecao(); }}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: Cores.acento + '60' }}
                      thumbColor={modoEscuro ? Cores.acento : '#ccc'}
                    />
                  }
                />
                <MenuItem
                  icone="volume-high-outline"
                  titulo="Sons e Haptics"
                  subtitulo="Vibração e sons"
                  trailing={
                    <Switch
                      value={somHapticos}
                      onValueChange={(v) => { setSomHapticos(v); Hapticos.selecao(); }}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: Cores.acento + '60' }}
                      thumbColor={somHapticos ? Cores.acento : '#ccc'}
                    />
                  }
                />
                <MenuItem
                  icone="language-outline"
                  titulo="Idioma"
                  subtitulo="Português (BR)"
                  emBreve
                />
              </View>
            </View>

            {/* Suporte & Legal */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Suporte</Text>
              <View style={estilos.menuGrupo}>
                <MenuItem
                  icone="help-circle-outline"
                  titulo="Central de Ajuda"
                  emBreve
                />
                <MenuItem
                  icone="chatbubble-ellipses-outline"
                  titulo="Fale Conosco"
                  subtitulo="WhatsApp ou Email"
                  emBreve
                />
                <MenuItem
                  icone="star-outline"
                  titulo="Avaliar o App"
                  emBreve
                />
                <MenuItem
                  icone="document-outline"
                  titulo="Termos de Uso"
                  emBreve
                />
                <MenuItem
                  icone="shield-outline"
                  titulo="Política de Privacidade"
                  emBreve
                />
              </View>
            </View>

            {/* Ações da Conta */}
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Conta</Text>
              <View style={estilos.menuGrupo}>
                <MenuItem
                  icone="download-outline"
                  titulo="Exportar Meus Dados"
                  onPress={() => {
                    Hapticos.impactoLeve();
                    Alert.alert('Exportar Dados', 'Seus dados serão preparados e enviados para seu email.', [{ text: 'OK' }]);
                  }}
                />
                <MenuItem
                  icone="log-out-outline"
                  titulo="Sair da Conta"
                  perigo
                  onPress={sair}
                />
                <MenuItem
                  icone="trash-outline"
                  titulo="Excluir Conta"
                  perigo
                  onPress={() => {
                    Hapticos.impactoPesado();
                    confirmarAcao(
                      'Excluir Conta',
                      'Esta ação é irreversível. Todos os seus dados serão removidos permanentemente.',
                      () => {},
                      { confirmarLabel: 'Excluir', destrutivo: true },
                    );
                  }}
                />
              </View>
            </View>

            {/* Footer */}
            <View style={estilos.footer}>
              <Text style={estilos.footerLogo}>Oráculo Vivo</Text>
              <Text style={estilos.footerVersao}>Versão 1.0.0</Text>
              <Text style={estilos.footerCopy}>Feito com ✨ e intenção</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* Modal: editar nome */}
      <Modal
        visible={editandoNome}
        transparent
        animationType="fade"
        onRequestClose={() => setEditandoNome(false)}
      >
        <Pressable style={estilos.modalOverlay} onPress={() => setEditandoNome(false)}>
          <Pressable style={estilos.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={estilos.modalTitulo}>Editar Nome</Text>
            <Text style={estilos.modalSubtitulo}>Como deseja ser chamado?</Text>
            <TextInput
              style={estilos.modalInput}
              value={nomeInput}
              onChangeText={setNomeInput}
              placeholder="Seu nome ou nome espiritual"
              placeholderTextColor={Cores.textoSecundario}
              autoFocus
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={salvarNome}
            />
            <View style={estilos.modalBotoes}>
              <Pressable
                style={estilos.modalCancelar}
                onPress={() => setEditandoNome(false)}
              >
                <Text style={estilos.modalCancelarTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[estilos.modalSalvar, salvandoNome && { opacity: 0.6 }]}
                onPress={salvarNome}
                disabled={salvandoNome}
              >
                {salvandoNome
                  ? <ActivityIndicator size="small" color={Cores.fundoEscuro} />
                  : <Text style={estilos.modalSalvarTexto}>Salvar</Text>
                }
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}

/* ---- Menu Item ---- */
function MenuItem({ icone, iconeLib = 'ionicons', titulo, subtitulo, cor, onPress, trailing, perigo, emBreve }: MenuItemProps) {
  const Icone = iconeLib === 'material' ? MaterialCommunityIcons : Ionicons;
  const corIcone = perigo ? Cores.erro : cor ?? Cores.textoClaro;

  const conteudo = (
    <View style={estilos.menuItem}>
      <View style={[estilos.menuIcone, { backgroundColor: (perigo ? Cores.erro : Cores.acento) + '12' }]}>
        <Icone name={icone as any} size={20} color={corIcone} />
      </View>
      <View style={estilos.menuTextos}>
        <Text style={[estilos.menuTitulo, perigo && { color: Cores.erro }]}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.menuSubtitulo}>{subtitulo}</Text> : null}
      </View>
      {emBreve ? (
        <View style={estilos.emBreveBadge}>
          <Text style={estilos.emBreveTexto}>Em breve</Text>
        </View>
      ) : trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={Cores.textoSecundario} /> : null)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {conteudo}
      </Pressable>
    );
  }
  if (emBreve) {
    return <View accessible accessibilityLabel={`${titulo}, em breve`}>{conteudo}</View>;
  }
  return conteudo;
}

const estilos = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
  },
  header: {
    paddingHorizontal: Espacamento.md,
    paddingTop: Espacamento.md,
    paddingBottom: Espacamento.sm,
  },
  titulo: {
    fontFamily: Fontes.titulo,
    fontSize: 28,
    color: Cores.textoClaro,
  },
  perfilCard: {
    alignItems: 'center',
    paddingVertical: Espacamento.lg,
    marginHorizontal: Espacamento.md,
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    marginTop: Espacamento.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Espacamento.sm,
  },
  avatarImagem: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarGradiente: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: {
    fontFamily: Fontes.titulo,
    fontSize: 28,
    color: '#fff',
  },
  editarAvatar: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Cores.primaria,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#24312D',
  },
  nomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perfilNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 20,
    color: Cores.textoClaro,
  },
  nomeIconeEditar: {
    marginTop: 2,
  },
  perfilEmail: {
    fontFamily: Fontes.corpo,
    fontSize: 14,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  perfilBadges: {
    flexDirection: 'row',
    marginTop: Espacamento.sm,
  },
  badgeMembro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
  },
  badgeMembroTexto: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.acento,
  },
  secao: {
    paddingHorizontal: Espacamento.md,
    marginTop: Espacamento.lg,
  },
  secaoTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 14,
    color: Cores.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Espacamento.sm,
  },
  planoCard: {
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    padding: Espacamento.md,
  },
  planoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Espacamento.md,
  },
  planoIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  planoInfo: { flex: 1 },
  planoNome: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 17,
    color: Cores.textoClaro,
  },
  planoPreco: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.acento,
  },
  planoPeriodo: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
  },
  planoLimites: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RaioBorda.md,
    padding: Espacamento.md,
    marginBottom: Espacamento.sm,
  },
  limiteItem: {
    flex: 1,
    alignItems: 'center',
  },
  limiteValor: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 18,
    color: Cores.textoClaro,
  },
  limiteLabel: {
    fontFamily: Fontes.corpo,
    fontSize: 11,
    color: Cores.textoSecundario,
    marginTop: 2,
  },
  limiteDivisor: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  upgradeTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 13,
    color: Cores.acento,
  },
  menuGrupo: {
    backgroundColor: Cores.cardFundo,
    borderRadius: RaioBorda.lg,
    borderWidth: 1,
    borderColor: Cores.cardBorda,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espacamento.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuIcone: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Espacamento.sm,
  },
  menuTextos: { flex: 1 },
  menuTitulo: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoClaro,
  },
  menuSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 1,
  },
  emBreveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RaioBorda.full,
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
  },
  emBreveTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 10,
    color: Cores.acento,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Espacamento.xl,
    marginTop: Espacamento.lg,
  },
  footerLogo: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    color: 'rgba(212, 175, 55, 0.4)',
  },
  footerVersao: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: Cores.textoSecundario,
    marginTop: 4,
  },
  footerCopy: {
    fontFamily: Fontes.corpo,
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Espacamento.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E1B2E',
    borderRadius: RaioBorda.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    padding: Espacamento.lg,
  },
  modalTitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 20,
    color: Cores.textoClaro,
    marginBottom: 4,
  },
  modalSubtitulo: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    color: Cores.textoSecundario,
    marginBottom: Espacamento.md,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RaioBorda.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    paddingHorizontal: Espacamento.md,
    paddingVertical: 12,
    fontFamily: Fontes.corpo,
    fontSize: 16,
    color: Cores.textoClaro,
    marginBottom: Espacamento.md,
  },
  modalBotoes: {
    flexDirection: 'row',
    gap: Espacamento.sm,
  },
  modalCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RaioBorda.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  modalCancelarTexto: {
    fontFamily: Fontes.corpoSemibold,
    fontSize: 15,
    color: Cores.textoSecundario,
  },
  modalSalvar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RaioBorda.md,
    backgroundColor: Cores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSalvarTexto: {
    fontFamily: Fontes.corpoNegrito,
    fontSize: 15,
    color: Cores.fundoEscuro,
  },
});
