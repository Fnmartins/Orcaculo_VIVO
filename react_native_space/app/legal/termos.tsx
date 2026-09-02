import React from 'react';
import { PaginaLegal } from '../../components/PaginaLegal';

// TODO: trocar pelo e-mail oficial quando o dominio for definido.
const CONTATO = 'contato@oraculovivo.com';

export default function TelaTermos() {
  return (
    <PaginaLegal
      titulo="Termos de Uso"
      atualizadoEm="setembro de 2026"
      intro="Ao criar uma conta ou usar o Oráculo Vivo, você concorda com estes Termos de Uso. Leia com atenção — eles explicam o que oferecemos, o que esperamos de você e os limites do serviço."
      secoes={[
        {
          titulo: 'Aceitação dos Termos',
          paragrafos: [
            'Estes Termos regem o uso do aplicativo e site Oráculo Vivo ("Oráculo Vivo", "nós"). Ao acessar ou usar o serviço, você declara ter lido, compreendido e aceito estes Termos e a nossa Política de Privacidade.',
            'Se você não concordar com qualquer ponto, não utilize o Oráculo Vivo.',
          ],
        },
        {
          titulo: 'O que é o Oráculo Vivo',
          paragrafos: [
            'O Oráculo Vivo é um aplicativo de autoconhecimento e entretenimento que oferece experiências inspiradas em tradições como tarô, búzios, numerologia e astrologia, além de conteúdos de reflexão.',
            'IMPORTANTE: o conteúdo tem finalidade de reflexão pessoal e entretenimento. Ele NÃO constitui e não substitui aconselhamento médico, psicológico, jurídico, financeiro ou profissional de qualquer natureza. Decisões importantes da sua vida devem ser tomadas com apoio de profissionais qualificados.',
          ],
        },
        {
          titulo: 'Elegibilidade',
          paragrafos: [
            'Você deve ter pelo menos 18 anos para criar uma conta e utilizar o Oráculo Vivo. Ao usar o serviço, você confirma que atende a esse requisito.',
          ],
        },
        {
          titulo: 'Sua conta',
          paragrafos: [
            'Para acessar determinados recursos, você cria uma conta com e-mail e senha. Você é responsável por manter suas credenciais em segurança e por toda atividade realizada na sua conta.',
            'Comprometa-se a fornecer informações verdadeiras e a nos avisar caso suspeite de uso não autorizado da sua conta.',
          ],
        },
        {
          titulo: 'Planos, pagamentos e assinaturas',
          paragrafos: [
            'O Oráculo Vivo oferece um plano gratuito e planos pagos com recursos adicionais. Os preços vigentes são exibidos no aplicativo antes da contratação.',
            'Os pagamentos são processados pelo Mercado Pago. Ao contratar um plano, você concorda também com os termos do meio de pagamento. O acesso aos recursos pagos é liberado após a confirmação do pagamento.',
            'Assinaturas recorrentes, quando aplicável, são renovadas automaticamente pelo período contratado até que você cancele.',
          ],
        },
        {
          titulo: 'Cancelamento e reembolso',
          paragrafos: [
            'Você pode cancelar um plano a qualquer momento; o cancelamento encerra a renovação seguinte, mantendo o acesso até o fim do período já pago.',
            'Nos termos do Código de Defesa do Consumidor, você pode solicitar o cancelamento com reembolso em até 7 (sete) dias corridos a partir da contratação (direito de arrependimento). Para isso, entre em contato conosco pelo e-mail informado ao final.',
          ],
        },
        {
          titulo: 'Uso aceitável',
          paragrafos: [
            'Você concorda em não: usar o serviço para fins ilícitos; tentar burlar limites, segurança ou cobranças; copiar, revender ou redistribuir o conteúdo sem autorização; enviar conteúdo ofensivo, ilegal ou de terceiros sem permissão; ou prejudicar o funcionamento do serviço.',
          ],
        },
        {
          titulo: 'Propriedade intelectual',
          paragrafos: [
            'A marca, os textos, o design, o código e os demais elementos do Oráculo Vivo são protegidos e pertencem a nós ou aos nossos licenciadores. O uso do aplicativo não transfere a você qualquer direito sobre esses elementos.',
          ],
        },
        {
          titulo: 'Isenção de responsabilidade e limitação',
          paragrafos: [
            'O serviço é oferecido "no estado em que se encontra". Não garantimos que os resultados, leituras ou conteúdos sejam exatos, completos ou adequados a um propósito específico, e não nos responsabilizamos por decisões tomadas com base neles.',
            'Na máxima extensão permitida pela lei, o Oráculo Vivo não responde por danos indiretos, incidentais ou consequenciais decorrentes do uso do serviço.',
          ],
        },
        {
          titulo: 'Alterações nestes Termos',
          paragrafos: [
            'Podemos atualizar estes Termos periodicamente. Mudanças relevantes serão comunicadas no aplicativo. O uso continuado após a atualização significa concordância com a nova versão.',
          ],
        },
        {
          titulo: 'Contato',
          paragrafos: [
            `Dúvidas sobre estes Termos podem ser enviadas para ${CONTATO}.`,
          ],
        },
      ]}
    />
  );
}
