# Conselho de Produto — Mapa Numerológico Expandido

Data da decisão: 27 de agosto de 2026

## Referência analisada

O conselho analisou a apresentação pública do produto de Rafa Almeida como referência de categoria e percepção de valor. A referência não autoriza copiar marca, textos, identidade visual, depoimentos ou metodologia proprietária.

## Decisão

Evoluir o **Mapa Numerológico** já existente para um **Mapa Numerológico Expandido**, em vez de criar uma feature paralela. O Oráculo Vivo já calcula Caminho de Vida, Expressão, Alma, Personalidade, Ano Pessoal e Maturidade, além de interpretações temáticas. Uma terceira implementação aumentaria inconsistências e manutenção.

Prioridade: **P1 obrigatória**, iniciada após a consolidação dos dois motores atuais (`data/numerologia.ts` e `data/mapa-numerologico.ts`).

## Conselho responsável

- Especialista em metodologia numerológica, para documentar regras e variações.
- Revisor quantitativo, para validar fórmulas, reduções e números mestres.
- Psicólogo ou especialista em ética do autoconhecimento, para evitar determinismo e dependência.
- Orientador de carreira, para transformar interpretações em perguntas e ações realistas.
- Especialista em UX e acessibilidade, para organizar um relatório longo sem sobrecarga.
- Especialista em privacidade, para nome, data de nascimento e textos pessoais.
- Designer editorial, para leitura na tela e futura exportação em PDF.

## O que aproveitar da referência

- Uma entrega percebida como completa, organizada por áreas da vida.
- Entrada simples: nome completo, data de nascimento e contexto opcional.
- Ciclos e linha do tempo como complemento aos números centrais.
- Relatório que combina explicação, síntese e próximos passos.
- Possibilidade futura de salvar um retrato da leitura e exportar um PDF acessível.

## O que não será reproduzido

- Promessas de dinheiro, prosperidade, sucesso, cura ou melhora de saúde.
- Afirmações de carreira correta, parceiro ideal ou destino inevitável.
- Linguagem de “quebrar karmas” como fato ou diagnóstico.
- Alegação de que mudar a grafia do nome altera resultados concretos da vida.
- Escassez, prova social ou autoridade não verificáveis.
- Números inventados ou modificados por IA.

## Escopo aprovado

### 1. Base auditável

- Unificar os cálculos duplicados em um único motor versionado.
- Exibir a trilha de cálculo de cada resultado.
- Documentar alfabeto, reduções, exceções e tratamento dos números mestres.
- Criar testes de referência para nomes, datas, acentos e entradas incompletas.

### 2. Leitura expandida

- Números centrais já existentes: Caminho de Vida, Expressão, Alma e Personalidade.
- Maturidade, pináculos, desafios e ciclos pessoais.
- Ano Pessoal com uma linha do tempo dos 12 meses.
- Lições ou débitos kármicos apenas como tradição simbólica, com linguagem não determinista.
- Integrações de talentos, carreira, relacionamentos, recursos, hábitos e espiritualidade.

### 3. Nome de nascimento e nome atual

Permitir uma comparação opcional entre nome de nascimento e nome usado atualmente. A interface mostrará diferenças entre leituras simbólicas, sem prescrever “nome de poder” e sem alegar efeito financeiro, médico ou causal.

### 4. Resultado útil

- Resumo inicial com três potenciais, três tensões e três perguntas de reflexão.
- Seções progressivas, recolhíveis e navegáveis.
- Plano reflexivo de 30 e 90 dias escolhido pelo usuário.
- Ações para salvar, retomar e, numa etapa posterior, exportar o relatório.

## Princípios de experiência

- Informar antes do cálculo que numerologia é uma prática simbólica de reflexão, não ciência, previsão ou aconselhamento profissional.
- Separar claramente resultado calculado, interpretação tradicional e síntese assistida por IA.
- Nunca enviar nome, data ou relato pessoal a um serviço remoto sem consentimento explícito.
- Permitir excluir histórico e evitar exposição de dados sensíveis em compartilhamentos.
- Não usar medo, urgência ou linguagem absoluta para aumentar conversão.

## Fases de execução

### Fase 1 — Fundação

Consolidar motores, definir metodologia, adicionar testes e revisar as interpretações atuais que fazem promessas excessivas.

### Fase 2 — Ciclos

Implementar pináculos, desafios, ciclos e linha do tempo do Ano Pessoal com trilha de cálculo.

### Fase 3 — Relatório

Redesenhar o resultado com navegação por seções, síntese, perguntas e plano de 30/90 dias.

### Fase 4 — Persistência e PDF

Salvar versões do mapa, controlar privacidade e gerar exportação acessível, sem incluir conteúdo sensível por padrão.

## Critérios de aceite

- O mesmo dado de entrada sempre produz os mesmos números na mesma versão da metodologia.
- Cada número pode ser conferido pelo usuário por meio da trilha de cálculo.
- Nenhum texto promete resultado financeiro, afetivo, profissional ou de saúde.
- Entradas inválidas não geram uma leitura fictícia.
- A experiência funciona em telas pequenas, teclado e leitor de tela.
- A comparação de nomes é opcional e apresentada como exploração simbólica.
- O relatório distingue cálculo, tradição interpretativa e conteúdo gerado por IA.

## Relação com outras features

O Mapa Numerológico Expandido pode alimentar futuramente o **Mapa de Vocação & Ciclos**, mas não deve se apresentar como avaliação profissional nem substituir dados de competências, preferências e contexto real. A numerologia permanece uma lente simbólica opcional.

## Execução — 28 de agosto de 2026

Primeiro recorte da Jornada Numerológica Guiada concluído:

- `data/mapa-numerologico.ts` tornou-se a fonte comum dos cálculos usados também pela leitura numerológica simples.
- Ano Pessoal integrado ao mapa detalhado com ano de referência explícito e trilha de cálculo.
- Resultado organizado em cinco etapas navegáveis: Resumo, Cálculos, Individual, Integração e Meu Plano.
- Plano local de reflexão de 30/90 dias, sem persistência ou envio de dados.
- Navegação acessível com estado de abas, indicador de etapa e opções com semântica de checkbox.
- Validação ocorre antes da geração e integração do mapa.
- Interpretações críticas revisadas para remover promessas de prosperidade, cura, superioridade ou destino profissional.
- Testes de referência adicionados para normalização, cálculos, Ano Pessoal, trilha e número mestre 33.

Validação técnica concluída:

- 5 testes automatizados aprovados.
- TypeScript sem erros.
- Expo Doctor com 18/18 verificações aprovadas.
- Exportação web concluída com 32 assets e bundle principal de aproximadamente 2,27 MB.
- Rota de resultado respondeu HTTP 200 em `localhost:8082`.

### Complemento — comparação de nomes

- Comparação opcional entre nome de nascimento e nome usado atualmente implementada.
- O segundo nome não é obrigatório, não é enviado quando vazio ou igual ao nome de nascimento e não é persistido.
- A comparação cobre Expressão, Alma, Personalidade e Maturidade; Caminho de Vida e Ano Pessoal permanecem ligados à data.
- A interface evita classificar um nome como melhor, corrigido ou mais próspero e não recomenda alterar documentos ou assinatura.
- Formulário passou a validar datas reais e limitar os campos de nome.
- TypeScript, testes e exportação web permaneceram aprovados; rota com os dois nomes respondeu HTTP 200.

Permanecem para fases posteriores: pináculos, desafios, linha do tempo mensal, persistência, PDF e o Triângulo da Vida condicionado à validação metodológica.

### Automação de QA — 28 de agosto de 2026

- Jest configurado corretamente com o preset `jest-expo`.
- Testes de tela adicionados com React Native Testing Library.
- Cobertura comportamental inclui data inexistente, omissão segura do nome atual, comparação com segundo nome e ocultação da aba quando não há comparação.
- Auditoria estática dos controles adicionou rótulos acessíveis aos nomes, campos de data e botões principais.
- Mensagens de erro passaram a ser anunciadas como alerta por tecnologias assistivas.
- Suíte consolidada: 2 arquivos, 9 testes aprovados e TypeScript sem erros.
- Teste visual por navegador foi ativado após a instalação do Playwright e do Chromium.

### Playwright e Chromium

- `@playwright/test` e Chromium instalados para QA end-to-end.
- Configuração reutiliza o servidor Expo em `localhost:8082` ou o inicia automaticamente quando necessário.
- Matriz móvel cobre 320×700, 375×812, 390×844 e 430×932.
- Testes verificam overflow horizontal, erros de console, exceções de página, comparação de nomes, plano reflexivo e recuperação de parâmetros inválidos.
- Primeira execução concluída com 12/12 cenários aprovados em Chromium headless.
- Artefatos e relatório HTML ficam fora do Git por meio de `.gitignore`.

### Auditoria ampliada de rotas e acessibilidade

- `@axe-core/playwright` integrado à suíte end-to-end com regras WCAG 2 A e AA.
- Sete rotas públicas críticas passaram a ser verificadas contra exceções de página e overflow horizontal.
- Introdução, formulário e resultado do Mapa Numerológico passaram na auditoria sem violações graves.
- Botões de retorno receberam papel semântico; regiões roláveis podem receber foco pelo teclado.
- No web, a leitura começa com opacidade integral para não degradar contraste durante a entrada animada; a animação foi preservada no aplicativo nativo.
- Contraste do selo `PREMIUM` foi elevado acima do mínimo WCAG AA.
- Regressão final: 43 cenários Playwright aprovados e 9 ignorados intencionalmente, pois a auditoria Axe roda apenas no viewport móvel de referência; 9/9 testes Jest e TypeScript também aprovados.
