import React from 'react';
import { PaginaLegal } from '../../components/PaginaLegal';

// E-mail oficial de contato — garantir que a caixa/encaminhamento exista no domínio arcanus.com.br.
const CONTATO = 'contato@arcanus.com.br';

export default function TelaPrivacidade() {
  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      atualizadoEm="setembro de 2026"
      intro="Sua privacidade importa. Esta Política explica quais dados o Arcanus coleta, como os usamos e quais são os seus direitos, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)."
      secoes={[
        {
          titulo: 'Quem somos',
          paragrafos: [
            'O Arcanus é o responsável pelo tratamento dos dados pessoais coletados no aplicativo e site. Para qualquer questão de privacidade, use o contato ao final desta Política.',
          ],
        },
        {
          titulo: 'Dados que coletamos',
          paragrafos: [
            'Dados de cadastro: nome e e-mail informados na criação da conta.',
            'Dados de uso: histórico de consultas e leituras, preferências, intenções e progresso dentro do aplicativo.',
            'Conteúdo opcional que você fornece: foto de perfil e imagens enviadas para funcionalidades específicas (por exemplo, análises que dependem de imagem).',
            'Dados de pagamento: quando você contrata um plano, o pagamento é processado pelo Mercado Pago. Não coletamos nem armazenamos os dados do seu cartão — recebemos apenas a confirmação e a situação da transação.',
          ],
        },
        {
          titulo: 'Como usamos os dados',
          paragrafos: [
            'Usamos seus dados para: criar e manter sua conta; oferecer e personalizar as experiências do aplicativo; registrar seu histórico; processar pagamentos e liberar os planos; enviar comunicações essenciais (como confirmação de e-mail e recuperação de senha); e melhorar e proteger o serviço.',
            'A base legal para esses tratamentos é a execução do contrato com você, o cumprimento de obrigações legais e o legítimo interesse, conforme o caso.',
          ],
        },
        {
          titulo: 'Compartilhamento de dados',
          paragrafos: [
            'Não vendemos seus dados pessoais. Compartilhamos dados apenas com prestadores necessários ao funcionamento do serviço, como: Supabase (autenticação e banco de dados), Mercado Pago (processamento de pagamentos) e o provedor de envio de e-mails.',
            'Também podemos divulgar dados quando exigido por lei ou por autoridade competente.',
          ],
        },
        {
          titulo: 'Recursos de inteligência artificial',
          paragrafos: [
            'Algumas funcionalidades podem utilizar processamento por inteligência artificial. Quando isso ocorrer, o conteúdo enviado por você (como um texto ou imagem) pode ser processado para gerar o resultado. Não usamos esse conteúdo para identificar você fora do serviço.',
          ],
        },
        {
          titulo: 'Armazenamento local',
          paragrafos: [
            'Podemos armazenar informações no seu dispositivo (por exemplo, preferências e sessão) para manter você conectado e melhorar sua experiência.',
          ],
        },
        {
          titulo: 'Segurança',
          paragrafos: [
            'Adotamos medidas técnicas e organizacionais para proteger seus dados, como transmissão criptografada e controle de acesso. Nenhum sistema é 100% seguro, mas trabalhamos para reduzir riscos.',
          ],
        },
        {
          titulo: 'Seus direitos (LGPD)',
          paragrafos: [
            'Você pode, a qualquer momento, solicitar: confirmação e acesso aos seus dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; e informações sobre compartilhamento.',
            'Você pode também excluir sua conta. Para exercer esses direitos, entre em contato pelo e-mail informado ao final.',
          ],
        },
        {
          titulo: 'Retenção',
          paragrafos: [
            'Mantemos seus dados enquanto sua conta estiver ativa ou pelo tempo necessário para cumprir as finalidades desta Política e obrigações legais. Após isso, os dados são eliminados ou anonimizados.',
          ],
        },
        {
          titulo: 'Menores de idade',
          paragrafos: [
            'O Arcanus destina-se a maiores de 18 anos e não coleta intencionalmente dados de menores. Se identificarmos um cadastro de menor, a conta poderá ser removida.',
          ],
        },
        {
          titulo: 'Alterações nesta Política',
          paragrafos: [
            'Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas no aplicativo, com a data de atualização revista no topo.',
          ],
        },
        {
          titulo: 'Contato',
          paragrafos: [
            `Para dúvidas ou solicitações sobre privacidade e seus dados, escreva para ${CONTATO}.`,
          ],
        },
      ]}
    />
  );
}
