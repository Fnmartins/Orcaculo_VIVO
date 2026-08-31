# Conselho de Design e UX — Oráculo Vivo

Data: 24/08/2026

## Veredito

O app já tem identidade reconhecível — roxo profundo, dourado, símbolo do olho e tipografia editorial — mas precisa consolidar robustez e hierarquia antes de ampliar o catálogo. A prioridade aprovada é estabilizar a experiência aberta e entregar uma primeira leitura curta antes de pedir cadastro ou assinatura.

## Evidências observadas

- Em 390 × 844, a Welcome corta horizontalmente “Sua jornada de autoconhecimento...” e as linhas seguintes.
- Há espaço vertical excessivo entre símbolo e título, enquanto os CTAs ficam comprimidos no rodapé.
- Login exibiu somente fundo e botão voltar durante a captura, sem formulário ou loading explicativo.
- Planos exibiu essencialmente fundo vazio e CTAs no rodapé, sem contexto visível da oferta.
- A Home chegou ao shell com tabs, mas o conteúdo central permaneceu invisível na captura headless. Como nenhuma nova exceção foi capturada nessa execução, isso é uma falha de robustez/renderização a investigar, não prova de relação com o easing corrigido.
- O erro `easing is not a function` teve causa confirmada: `Easing.sine` não existe; a API correta é `Easing.sin`.

## Parecer dos seis

### Produto

O app oferece muitas modalidades antes de provar valor. A Home deve responder “o que posso descobrir agora?” com uma experiência recomendada. Cadastro só quando houver motivo concreto para salvar ou aprofundar.

### Product design mobile

Manter a direção visual, mas disciplinar largura de texto, escala responsiva, safe areas e espaçamento. Conteúdo essencial deve nascer visível; animação aprimora a tela, não pode ser requisito para enxergá-la.

### UX research

Onboarding progressivo: intenção simples → leitura curta → resultado → personalização opcional. Perguntas longas antes do valor parecem barreira de login.

### Acessibilidade

Validar contraste, texto ampliado, redução de movimento, foco web, labels e alvos de 44 × 44 px. Toda tela crítica precisa de loading, erro e tentar novamente.

### Ética e monetização

Distinguir reflexão/entretenimento de aconselhamento profissional. Evitar previsões deterministas, urgência artificial e paywall após conteúdo emocionalmente sensível. Explicar benefício, periodicidade e cancelamento antes da compra.

### O Forasteiro

Talvez o usuário queira clareza sobre uma pergunta, não “vários oráculos”. Organizar a entrada por intenção — amor, trabalho, decisão, autoconhecimento — pode ser mais compreensível que organizar apenas por modalidade.

## Consenso e divergência

Consenso: preservar a identidade, corrigir estabilidade/overflow, entregar valor antes do cadastro, manter alternativa gratuita e nunca depender de animação para mostrar conteúdo.

Produto favorece Home por intenção; design quer manter modalidades visíveis. Solução híbrida: ação recomendada por intenção no topo e seção secundária “Escolha seu oráculo”.

## Prioridades

### P0 — estabilidade

1. Garantir conteúdo estático em Home, login e planos enquanto dados, fontes ou animações carregam.
2. Eliminar overflow horizontal em 320, 375, 390 e 430 px.
3. Adicionar loading, erro e retry.
4. Corrigir os 11 erros TypeScript restantes.
5. Criar regressão visual das rotas críticas.

### P1 — primeira jornada de valor

1. Home pergunta: “Sobre o que você busca clareza hoje?”
2. Uma leitura inicial curta sem conta.
3. No resultado, CTA contextual “Salvar esta leitura” → cadastro.
4. Explicar claramente o que funciona anonimamente.

### P2 — sistema e confiança

1. Tokens de cor, tipografia, espaçamento e movimento.
2. Componentes comuns de cabeçalho, loading, vazio, erro e CTA.
3. Linguagem editorial: reflexão, não certeza; apoio, não diagnóstico.
4. Planos com comparação legível antes do CTA.

### P3 — expansão

Personalização, recomendações entre modalidades e novas práticas apenas após medir o funil principal.

## Quick wins — até um dia

- Aplicar largura máxima e padding lateral aos textos da Welcome.
- Reduzir o vazio vertical em telas baixas.
- Mostrar skeleton/mensagem em login e planos.
- Definir valores finais visíveis antes das animações.
- Corrigir o ícone inválido `cards-outline` e outros erros simples do typecheck.

## Jornada recomendada

Splash curta → Home aberta por intenção → primeira experiência gratuita → resultado responsável → cadastro para salvar/aprofundar → planos com benefício e alternativa gratuita.

## Critérios de aceite

- Zero overflow horizontal entre 320–430 px.
- Conteúdo visível com redução de movimento ou animação atrasada.
- Toda rota crítica tem loading, erro e retry.
- Usuário anônimo conclui uma experiência.
- Cadastro preserva o progresso e explica o benefício.
- Planos mostram preço, periodicidade, renovação, cancelamento e limites.
- Navegação por teclado e alvos móveis de 44 px.

## Preservar

Paleta roxo/dourado, símbolo do olho, tipografia editorial, alternativa gratuita e telas de autenticação/onboarding para reativação contextual futura.

## Próximo slice recomendado

Robustez P0 + regressão visual mobile/web. Depois, prototipar apenas a Home por intenção, sem reconstruir todas as modalidades de uma vez.

## Execução P0 — 24/08/2026

- TypeScript zerado: 13 → 0 erros.
- Corrigido o crash `easing is not a function` no preparo da consulta; validado em sessão limpa, sem exceções.
- Home, Welcome, login e planos agora nascem visíveis na web mesmo quando animações estão pausadas.
- Welcome, login e planos validados sem overflow e com conteúdo em 320, 390 e 430 px.
- A Home aberta foi validada após a splash, exibindo conteúdo para usuário anônimo.
- Anéis decorativos do preparo agora são recortados pelo viewport e não devem criar rolagem horizontal.

## Execução P1 — 24/08/2026

- Home aberta agora começa por intenção: Amor, Trabalho, Uma decisão ou Eu mesmo.
- Cada intenção apresenta recomendação e linguagem reflexiva, sem promessa determinista.
- CTA principal comunica “experiência gratuita”, “sem cadastro” e duração aproximada.
- Catálogo de oráculos foi preservado como escolha secundária.
- Fluxo usa as rotas e gates existentes; nenhum bypass ou API paralela foi criado.
- Validado em 320, 390 e 430 px: conteúdo completo, zero overflow e zero exceções.
- Resultados de Tarot, Búzios e Leitura do Dia agora exibem convite contextual apenas para visitantes anônimos.
- O convite não bloqueia a leitura, mantém as ações existentes e leva ao cadastro gratuito.
- A mensagem foi ajustada para não prometer persistência da leitura atual antes dessa capacidade existir: comunica histórico para as próximas leituras e confirma que o resultado atual permanece na tela.

## Identidade por oráculo — 24/08/2026

- A vitrine da Home deixou de representar Búzios, Tarot e Numerologia apenas com ícones genéricos.
- Búzios usa a fotografia da mesa fornecida e conchas abertas/fechadas; Tarot usa cartas ornamentadas em leque; Numerologia usa números e geometria orbital.
- O preparo e o resultado dos Búzios agora usam a ilustração realista de concha, preservando a diferença visual entre aberto e fechado.
- Os vídeos fornecidos foram incorporados ao fluxo dos Búzios em arquivos locais compactos, com início no trecho útil, transição curta e ilustração de concha como fallback.
- A leitura completa e a Carta do Dia agora apresentam cada arcano dentro de uma carta ornamentada reutilizável, em vez de um ícone circular genérico.
- Os contadores de Búzios abertos e fechados usam a anatomia visual correspondente da concha.
- Mapa Astral ganhou órbitas, sol e planetas; Matriz do Destino ganhou diagrama geométrico com 22; Lei da Atração ganhou halo e manifestação luminosa.
- Borra de Café ganhou xícara, anel e vapor; Quiromancia ganhou palma e linhas douradas. As artes são vetoriais/nativas para evitar novo peso no bundle.
- Regressão web concluída: Home em 320, 390 e 430 px e seis rotas de entrada em 320 px, sem overflow horizontal ou exceções de runtime.
- Cards de modalidade agora expõem explicitamente o papel acessível de botão, além do rótulo existente.

## Refinamento do lançamento dos Búzios — 24/08/2026

- A mão vetorial foi removida e substituída pelo vídeo real `Buzios.mp4` fornecido pelo projeto.
- O vídeo funciona como transição do toque para a queda interativa dos 12 búzios e possui fallback caso a mídia falhe.
- A sombra retangular dos SVGs foi desativada na web, eliminando os quadrados visíveis ao redor de cada concha; a sombra orgânica interna foi preservada.
- Fluxo validado em 390 px: vídeo inicia e termina, resultado fica disponível, zero overflow e zero exceções.

## Preservação da leitura no cadastro — 25/08/2026

- Com autorização explícita do proprietário, Tarot, Búzios e Leitura do Dia transportam o resultado escolhido para o cadastro.
- O payload fica temporariamente no dispositivo apenas após o toque em “Criar conta e salvar”.
- Depois da autenticação, a leitura é inserida na tabela `consultas` com o ID do usuário e só então removida do armazenamento local.
- Falhas no Supabase preservam a cópia local para nova tentativa; uma trava impede migrações concorrentes e duplicação durante o mesmo ciclo.
- Fluxo local validado em 390 px: leitura revelada, payload gravado, cadastro aberto e zero exceções. O payload de teste foi removido ao final.

## Recorte e entrada do vídeo de Búzios — 25/08/2026

- As barras pretas do arquivo vertical deixaram de reduzir o conteúdo útil: o trecho central agora é apresentado em painel cinematográfico 16:9, ampliado moderadamente sobre a mesa.
- A reprodução salta a aproximação inicial vazia e começa no momento em que búzio e mãos entram em cena.
- Entrada e saída ganharam fade curto; a saída conduz diretamente à queda interativa das conchas.
- Removida também a sombra web do contêiner animado, segunda origem dos quadrados ao redor dos búzios.
- Validado em 390 px: vídeo termina, resultado aparece, zero overflow e zero exceções.
- `Buzios2.mp4` passou a abrir a preparação em painel 16:9 de largura quase total, começando no trecho útil e com búzio ilustrado como fallback de carregamento/erro.
- A captura automatizada dessa segunda abertura não retornou imagem porque a sessão do navegador de inspeção encerrou; compilação e tratamento de fallback foram validados, mas a conferência visual final ficou pendente.

## Fechamento de confiança e ações — 26/08/2026

- Removidas ações silenciosas do Perfil: recursos ainda indisponíveis agora aparecem como “Em breve”, sem comportamento de botão.
- Removido o sino de notificação sem destino da Home.
- Formatos ainda não entregues (áudio, vídeo e PDF) permanecem informativos e claramente marcados como “Em breve”.
- Avaliações deixam de aparecer quando nenhuma integração real de envio é fornecida; o app não agradece mais por dados que não foram persistidos.
- A vitrine de atendimento humano passou a se declarar como prévia. Perfis, horários e pagamentos são informados como inativos, e tocar em “Em breve” não cria uma consulta apenas na memória.
- A lista “Agendadas” não nasce mais preenchida com consultas demonstrativas apresentadas como reais.
- TypeScript e verificação de whitespace do diff permanecem sem erros.

## Estado final do plano

- P0 concluído no código: conteúdo estático, proteção de overflow, estados de loading/erro/retry e TypeScript zerado. A matriz visual foi validada nas larguras críticas disponíveis; a inspeção automatizada do segundo vídeo continua limitada pelo encerramento da sessão do navegador.
- P1 concluído: jornada por intenção, primeira leitura sem conta, preservação para cadastro e explicação do modo anônimo.
- P2 concluído no escopo do produto atual: tokens, estados comuns, linguagem reflexiva, comparação de planos e remoção de promessas funcionais não sustentadas.
- P3 permanece deliberadamente fora deste ciclo: expansão, telemetria e novos formatos só devem avançar depois de infraestrutura real, consentimento e medição do funil principal.

## Refinamento dos vídeos de Búzios — 26/08/2026

- Confirmado que os dois vídeos integrados possuem resolução nativa de 1280 × 720; a falta de clareza vinha principalmente do tamanho de apresentação, não do arquivo.
- O ritual de preparação passou de uma faixa 16:9 para um painel 4:3 quase na largura total, aumentando a altura útil em cerca de 33% no celular.
- O lançamento também ganhou enquadramento 4:3, agora limitado à largura real da mesa, sem o recorte lateral provocado pelo contêiner de 118%.
- A máscara escura do lançamento foi reduzida de 72% para 34%, e a vinheta da preparação de 12% para 4%, deixando mãos, búzios e textura mais legíveis.

## Validação de entrega e desempenho — 26/08/2026

- Exportação web de produção concluída com sucesso; os dois vídeos, a mesa e os demais assets foram incorporados ao artefato final.
- Os imports tipográficos passaram dos índices completos para módulos específicos dos cinco pesos realmente usados.
- O build caiu de 72 para 49 assets, removendo 19 arquivos de fonte desnecessários e aproximadamente 3 MB de transferência potencial sem alterar a identidade visual.
- TypeScript permaneceu sem erros após a otimização.

## Segurança de pagamentos — 26/08/2026

- O aplicativo deixou de acessar diretamente `MERCADOPAGO_ACCESS_TOKEN` e a API privada do Mercado Pago.
- Criada Edge Function autenticada que recebe somente o ID do plano; usuário, preços, descrição e referência são definidos no servidor.
- A assinatura pendente agora nasce no servidor e recebe um identificador próprio nos metadados da preferência.
- Criado webhook idempotente que consulta o pagamento diretamente no Mercado Pago, valida usuário, plano e valor e só então ativa assinatura e perfil.
- `.env` foi preservado localmente, removido do rastreamento Git e protegido por `.gitignore`.
- Como a credencial já existiu no histórico, a rotação do token no painel continua sendo uma ação operacional obrigatória antes do deploy.

## Privacidade da IA — 26/08/2026

- Removida do cliente a chamada direta ao Abacus e qualquer leitura de `EXPO_PUBLIC_ABACUS_API_KEY`.
- O envio remoto de fotos de mãos, xícaras e textos pessoais permanece desativado até existir consentimento explícito e política de privacidade adequada.
- As análises de imagem continuam usando os fallbacks locais; as leituras principais de Tarot e Búzios permanecem funcionais sem terceiros.
- Os CTAs de aprofundamento remoto foram ocultados enquanto a integração está indisponível, evitando uma ação falsa ou repetição inútil de erro.
- A varredura de padrões não encontrou execução dinâmica, HTML inseguro, transporte HTTP, JWT manual ou acesso a segredos no cliente.

## Fechamento de bundle e dependências — 26/08/2026

- Os imports de `@expo/vector-icons` foram direcionados às famílias realmente usadas: Ionicons e MaterialCommunityIcons.
- A exportação web caiu de 49 para 32 assets e o JavaScript principal de 2,52 MB para 2,28 MB.
- Quinze famílias tipográficas de ícones deixaram de entrar no bundle sem alteração visual.
- Axios foi removido como dependência direta após a migração das chamadas privadas para Edge Functions e `fetch` nativo.
- Exportação web de produção e TypeScript concluídos sem erros depois das mudanças.

## Auditoria de dependências — 26/08/2026

- `npm audit fix` sem `--force` reduziu os achados de 23 para 22 e os de severidade alta de 10 para 9.
- Os achados restantes pertencem à cadeia Expo/Metro (`image-size`, `postcss` e `uuid`) e a correção automática exige Expo 57, uma mudança incompatível com o SDK atual.

## Fechamento de release local — 26/08/2026

- Padronizado o projeto em Yarn 4.13.0: removido o `package-lock.json`, atualizado o `yarn.lock` e configurado o EAS para usar `yarn install --immutable`.
- Adicionados os peers compatíveis `@babel/runtime` e `react-refresh` exigidos pelo preset do Expo 54.
- `.expo/` passou a ser ignorado e seus arquivos locais foram removidos somente do índice Git, sem exclusão no computador.
- Expo Doctor concluído com 18/18 verificações aprovadas.
- TypeScript concluído sem erros e exportação web final gerada com 32 assets e bundle principal de aproximadamente 2,28 MB.

## Feature aprovada — Mapa de Vocação & Ciclos

- O conselho aprovou como P1 obrigatório um produto de astrologia aplicado ao trabalho, combinando mapa natal profissional e trânsitos dos próximos 12 meses.
- A implementação está bloqueada até a substituição do motor astrológico simulado por cálculos reais com efemérides, geocodificação, timezone histórico, casas, Meio do Céu, aspectos e trânsitos.
- O produto deverá oferecer reflexão e planejamento, sem indicar profissão, prever sucesso ou substituir orientação profissional.
- Escopo, arquitetura, privacidade e critérios de aceite estão documentados em `docs/2026-08-27-conselho-mapa-profissional.md`.
- A atualização forçada foi deliberadamente evitada para não introduzir regressões; a migração do SDK deve ocorrer em um ciclo próprio com testes nativos completos.

## Execução P0.3 e P2.2 — 25/08/2026

- Criado um estado de tela comum para carregamento, erro e vazio, com hierarquia visual consistente, regiões acessíveis e ação mínima de 48 px.
- O histórico deixou de ocultar falhas de rede: agora informa o problema, preserva a confiança sobre os dados e oferece “Tentar novamente”.
- O carregamento do histórico passou a usar o indicador comum já preparado para movimento reduzido.
- Tarot, Búzios e análise por IA agora compartilham o mesmo estado de resultado inválido, com explicação contextual e retorno à etapa recuperável.
- Os estados internos de geração por IA anunciam progresso e identificam a nova tentativa corretamente para tecnologias assistivas.
- Numerologia, Mapa Numerológico, Mapa Astral e Matriz do Destino agora validam os parâmetros antes de exibir resultados; URLs incompletas não fabricam mais leituras com a data padrão 01/01/2000.
- A validação comum rejeita datas inexistentes, anos fora do intervalo, horários inválidos e campos pessoais vazios, direcionando o usuário de volta ao formulário.
- Tarot, Búzios, análises de imagem, Numerologia, Mapa Astral e Matriz do Destino exibem uma nota comum de leitura simbólica, reflexão e autonomia de escolha; o Mapa Numerológico preserva seu aviso científico mais específico.
- Os prompts de IA foram protegidos contra previsões deterministas, diagnósticos e recomendações médicas, legais ou financeiras.
- O prompt dos Búzios deixou de personificar pai/mãe de santo: agora respeita as tradições afro-brasileiras, não inventa fundamentos ou falas dos Orixás e não substitui consulta religiosa presencial.
- A narrativa fixa do Tarot passou de afirmação sobre o futuro para possibilidades condicionadas às escolhas do consulente.
- Removidos os ícones de compartilhamento sem função de Numerologia, Mapa Astral e Matriz do Destino; os cabeçalhos preservam alinhamento sem sugerir ações inexistentes.
- Voltar, fechar e abas das principais telas de resultado ganharam semântica acessível, estado selecionado e alvos mínimos de 44 px.
- O carregamento aprofundado dos Búzios agora informa “Interpretando os símbolos do jogo”, sem afirmar que a IA fala pelos Orixás.
- Os seletores de formato de Tarot, Búzios e análises deixaram de responder ao toque sem resultado: Texto é comunicado como atual e Áudio, Vídeo e PDF como “Em breve”, visualmente e para leitores de tela.
- “Receba em outros formatos” foi substituído por “Formato da leitura”, evitando prometer recursos ainda indisponíveis.
- Os resultados locais de Borra de Café e Quiromância foram reescritos para não afirmar saúde, longevidade, viagens, relacionamentos, proteção ou oportunidades futuras como fatos.
- Os fallbacks preservam a linguagem mística, mas agora apresentam associações tradicionais como símbolos para reflexão e recomendam considerar fatos, limites e apoio qualificado.
- Dez opções do Perfil que apenas vibravam passaram a ser itens informativos com selo “Em breve”, sem seta ou semântica de botão.
- O sino e o ponto de notificação fictício foram removidos da Home até existir uma central de notificações real; o alinhamento do cabeçalho foi preservado.
- A varredura global não encontrou mais handlers cuja única ação seja um impacto háptico leve.
- TypeScript permaneceu sem erros após a integração.

### Ajuste visual adiado

- A leitura visual dos vídeos dos Búzios ainda precisa de tratamento de contraste, enquadramento e seleção do trecho. O fluxo está funcional e os novos búzios foram aprovados; preservar o design atual das conchas ao revisar apenas o vídeo.
