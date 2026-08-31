# Conselho de Produto — Mapa de Vocação & Ciclos

Data: 27/08/2026  
Status: **Aprovado para implementação futura — prioridade P1 obrigatória**

## Referência analisada

Foi analisado o produto “Mapa do Trabalho”, da Astrologia Luz e Sombra. A proposta combina:

- mapa natal direcionado ao trabalho;
- trânsitos astrológicos dos próximos 12 meses;
- direção de vida por Sol e Meio do Céu;
- rotina, produtividade, recursos e realização pelas casas 2, 6 e 10;
- comunicação e ação por Mercúrio e Marte;
- desafios e forças simbólicas;
- relatório digital em linguagem acessível.

A referência deve orientar a categoria do produto, não textos, identidade, método proprietário ou promessa comercial.

## Conselho ampliado

O conselho conceitual passa a incluir estes papéis permanentes:

- especialista em astrologia natal e trânsitos;
- especialista em astrologia vocacional;
- orientador de carreira e desenho de vida;
- psicólogo ou especialista em ética de aconselhamento;
- especialista em UX inclusiva e acessibilidade;
- especialista em privacidade de dados pessoais;
- designer editorial para relatórios digitais;
- responsável por qualidade e auditabilidade dos cálculos.

As referências de mercado e autores estudados não participam do projeto e não endossam o produto.

## Decisão

Criar no Oráculo Vivo uma feature própria chamada provisoriamente **Mapa de Vocação & Ciclos**.

Ela não deve responder “qual profissão seguir” nem prever sucesso, contratação, renda ou demissão. Deve apresentar padrões simbólicos, perguntas de reflexão e ações que o usuário possa avaliar no contexto real da própria vida.

## Por que não implementar imediatamente

O motor atual em `data/astrologia.ts` é explicitamente uma simulação. Ele não possui:

- efemérides astronômicas;
- geocodificação da cidade;
- latitude e longitude;
- fuso horário histórico e horário de verão;
- cálculo real de Ascendente, Meio do Céu e casas;
- aspectos planetários;
- cálculo de trânsitos e janelas de data.

Como a cidade informada não participa do cálculo atual, o produto ainda não pode sustentar uma leitura profissional personalizada nem uma promessa de precisão.

## Escopo aprovado

### 1. Entrada e consentimento

- nome opcional;
- data, horário e cidade de nascimento;
- opção “não sei meu horário”, explicando a perda de precisão;
- consentimento específico para processar e armazenar dados de nascimento;
- política clara de retenção, exportação e exclusão.

### 2. Base natal profissional

- Sol, Meio do Céu e regente do Meio do Céu;
- casas 2, 6 e 10 e seus regentes;
- Mercúrio e Marte para comunicação, decisão e ação;
- Vênus e casa 2 para valores e relação simbólica com recursos;
- Saturno para estrutura, limites e maturação;
- aspectos relevantes com explicação didática.

### 3. Ciclos dos próximos 12 meses

- trânsitos relevantes sobre pontos profissionais do mapa natal;
- período aproximado, intensidade e repetição de cada trânsito;
- temas possíveis, perguntas de reflexão e cuidados;
- linha do tempo mensal sem linguagem determinista.

### 4. Entrega

- resumo inicial de leitura rápida;
- talentos e ambientes que favorecem o usuário;
- estilo de trabalho, comunicação e tomada de decisão;
- desafios recorrentes e recursos de desenvolvimento;
- ciclos atuais e próximos;
- plano reflexivo de 30 e 90 dias;
- relatório salvo no aplicativo;
- PDF acessível em uma etapa posterior.

## Arquitetura necessária

1. Adotar biblioteca ou serviço confiável de efemérides, executado no servidor.
2. Geocodificar cidade com confirmação do usuário.
3. Resolver timezone histórico para a data e coordenadas informadas.
4. Calcular mapa natal, casas, Meio do Céu, aspectos e trânsitos.
5. Armazenar um snapshot versionado dos dados calculados, nunca apenas o texto final.
6. Gerar interpretações a partir de dados estruturados e regras auditáveis.
7. Manter IA opcional e subordinada aos cálculos; nunca permitir que invente posições ou trânsitos.

## Critérios de aceite obrigatórios

- resultados comparados com mapas de referência conhecidos;
- testes para cidades, fusos e horários de verão diferentes;
- tolerância documentada para graus, casas e aspectos;
- nenhum planeta, casa ou trânsito criado pela IA;
- datas dos trânsitos reproduzíveis;
- linguagem não determinista e sem aconselhamento financeiro ou profissional conclusivo;
- acessibilidade de leitura e contraste;
- exclusão dos dados pessoais disponível ao usuário;
- revisão por astrólogo qualificado antes do lançamento.

## Sequência recomendada

1. Substituir o mapa astral simulado por um motor real.
2. Validar o motor com testes e revisão especializada.
3. Construir o relatório natal profissional.
4. Adicionar os trânsitos de 12 meses.
5. Testar compreensão e segurança da linguagem com usuários.
6. Liberar como beta identificado.
7. Somente depois avaliar monetização, PDF e compartilhamento.

## Registro de prioridade

Esta feature não é uma ideia opcional. Foi aprovada e deve permanecer no roadmap como **P1**, bloqueada apenas pelo motor astrológico real e pelas salvaguardas de privacidade e qualidade descritas acima.
