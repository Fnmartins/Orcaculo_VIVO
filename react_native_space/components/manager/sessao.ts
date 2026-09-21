import { router } from 'expo-router';
import { MENSAGEM_SESSAO_EXPIRADA } from '../../services/sessaoExpirada';
import { mostrarAlerta } from '../../utils/alerta';

/**
 * Sessão expirada não é perda de acesso: o papel de admin continua o mesmo, só
 * o token venceu. Avisa e manda para o login, em vez de sugerir que o usuário
 * foi rebaixado. Usada pelas abas do Painel que falam com o servidor.
 */
export function irParaLoginPorSessaoExpirada(): void {
  mostrarAlerta('Sessão expirada', MENSAGEM_SESSAO_EXPIRADA);
  router.replace('/auth/login');
}
