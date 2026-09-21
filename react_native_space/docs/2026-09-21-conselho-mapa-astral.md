# Conselho de Oraculistas — Mapa Astral

Data: 21/09/2026
Status: **Proposta — aguardando as decisões do Fabiano (seção "Decisões pendentes")**

## O que o Fabiano apontou

- O mapa astral é bonito, mas básico: provavelmente não está ligado a nenhuma API.
- As interpretações são frases soltas ("você expressa a dedicação de forma adaptável"); falta o contexto
  geral de cada aspecto, que é o que um astrólogo normalmente revela.
- O estilo agrada e os cards agradam, mas as fontes ficam estranhas junto das partes brilhantes, e o
  desenho do mapa precisa ser mais profissional.

## O que o código mostra

`data/astrologia.ts`, função `gerarMapaAstral`:

- **Só o signo solar é real** — sai da data de nascimento.
- **Lua:** `(hora + dia + mês) % 12`. Não é a posição da Lua; é uma conta aritmética.
- **Ascendente:** `hora ÷ 2`. O ascendente real depende da hora, da data e do **local** de nascimento; a
  cidade informada não entra em cálculo nenhum.
- **Planetas, casas e graus:** números derivados de uma "semente" aritmética.
- **Textos:** frases-modelo montadas com palavras-chave de cada signo — a frase citada pelo Fabiano sai
  literalmente da linha 192.
- **Aviso:** a tela mostra só a nota genérica "leitura simbólica para reflexão". Nada diz que Lua,
  ascendente, planetas e casas não foram calculados. Quem conhece o próprio mapa percebe em segundos.
- **Plano:** o Mapa Astral está em `consulta_basica` (`hooks/usePlano.ts`), liberado até no plano gratuito.

O conselho de 27/08 (Mapa de Vocação) já havia registrado que o motor é uma simulação sem efemérides, sem
geocodificação e sem fuso histórico. Resolver o motor aqui resolve lá também.

## Conselho

Papéis conceituais. Nenhuma pessoa real participa ou endossa o produto.

- astróloga com prática em mapa natal;
- responsável pela qualidade e pela auditoria dos cálculos (astronomia);
- especialista em astrologia vocacional (continuidade do conselho de 27/08);
- redatora de conteúdo astrológico em português;
- diretor de arte, com experiência em mapas e diagramas;
- especialista em experiência do usuário;
- especialista em privacidade de dados pessoais (LGPD);
- responsável de produto, pelo custo e pela prioridade.

## APIs e bibliotecas — o que existe (conferido em 21/09/2026 nas fontes oficiais)

| Opção | O que faz | Licença e custo | A favor | Contra |
|---|---|---|---|---|
| **Astronomy Engine** | Posições do Sol, Lua e planetas, em JavaScript, dentro do nosso servidor | MIT, grátis; precisão de ±1 minuto de arco | Sem custo por leitura; os dados de nascimento não saem do Arcanus | Casas e ascendente nós calculamos, a partir do tempo sidéreo — exige validação |
| **Swiss Ephemeris** | O padrão dos softwares profissionais; posições e casas | AGPL (obrigaria abrir o software inteiro) ou licença profissional paga, preço sob consulta | Precisão de 0,001 segundo de arco | Licença; binding nativo difícil no nosso ambiente (Deno) |
| **Astrologer API** (Kerykeion hospedado, RapidAPI) | Posições, casas, aspectos **e a roda do mapa em SVG**, com rótulos **em português** | Pago por plano no RapidAPI; a biblioteca é AGPL, a API hospedada é o caminho indicado pelo autor para uso comercial | Resultado profissional rápido, desenho pronto | Dependência externa; data, hora e local de nascimento vão para terceiro (LGPD) |
| **AstrologyAPI.com** | Suíte completa: posições, casas, roda, relatórios e interpretações | A partir de ₹ 2.999/mês (≈ US$ 35) para astrologia ocidental; créditos grátis no cadastro | Tudo pronto, inclusive textos | Português não aparece em lugar nenhum da oferta; textos genéricos |
| **AstroChart** | Só desenha a roda profissional (signos, casas, planetas no grau, linhas de aspecto) | MIT, grátis, TypeScript | Resolve o "mapa mais profissional" com os nossos próprios cálculos | Não calcula nada; no app nativo precisaria de WebView |
| **GeoNames** | Cidade → latitude, longitude e fuso horário (IANA) | Grátis, 10 mil consultas/dia; dados CC-BY (exige citar a fonte), com download para uso offline | Com o fuso IANA, o horário de verão histórico do Brasil sai correto | Crédito ao GeoNames na tela ou na política |

## Recomendações

**M0 — Honestidade já.** *(astróloga, privacidade, produto — prioridade máxima)* Até o motor real
existir, mostrar só o que é real: signo solar, elemento e modalidade, com texto de qualidade. Lua,
ascendente, planetas, casas e graus saem da tela. É a mesma regra dos cartões de plano: só o que o app
entrega hoje.

**M1 — Motor próprio com Astronomy Engine.** *(astronomia, privacidade)* Posições calculadas no nosso
servidor, sem custo por leitura e sem enviar dados de nascimento a terceiros. Casas e ascendente
calculados por nós (Placidus como padrão, que é o mais usado no Brasil). **Validação obrigatória:**
conferir uma bateria de 20 mapas conhecidos contra uma referência profissional antes de publicar.
*Plano B:* a Astrologer API, se quisermos resultado rápido e aceitarmos a dependência externa.

**M2 — Local e fuso de verdade.** *(astronomia, experiência do usuário)* Busca de cidade com GeoNames
(base offline, para não depender do serviço), que já traz o fuso IANA; o horário de verão histórico sai
correto. Opção "não sei minha hora": mapa sem casas e sem ascendente, explicando por quê.

**M3 — Textos de verdade, em português.** *(astróloga, redatora — o item mais longo)* Uma biblioteca de
interpretações escrita ou revisada por quem conhece astrologia: o que é cada elemento do mapa ("o que a
Lua representa") antes do "sua Lua em Escorpião"; planeta em signo (120 textos), planeta em casa (120),
aspectos principais, e uma síntese geral — equilíbrio de elementos e modalidades, regente do mapa. A IA
pode redigir o rascunho; a revisão é humana.

**M4 — Roda profissional com AstroChart.** *(diretor de arte)* O desenho padrão de mapa natal: anel dos
signos, casas, planetas no grau real e linhas de aspecto. Tipografia com duas famílias só (uma serifada
para títulos, uma sem serifa para leitura) e sem brilho sobre texto. Os cards que o Fabiano aprovou
ficam, organizando as seções.

**M5 — Dados de nascimento sob LGPD.** *(privacidade)* Data, hora e local de nascimento são dados
pessoais. Calcular no nosso servidor (M1), guardar só se a pessoa salvar o mapa, e dizer isso na
Política de Privacidade.

**M6 — Um motor, dois produtos.** *(vocacional, produto)* O mesmo motor destrava o Mapa de Vocação,
aprovado como P1 em 27/08. Construir uma vez.

**M7 — O que é grátis e o que é pago.** *(produto)* Hoje o mapa inteiro é liberado até no plano gratuito.
Com o mapa real, faz sentido o grátis mostrar signo solar, lunar e ascendente com síntese, e o mapa
completo ficar nos planos pagos.

## Ordem sugerida

1. **M0** — tirar da tela o que é inventado (pequeno, urgente);
2. **M1 + M2** — motor e localização, com a bateria de validação;
3. **M4** — a roda profissional;
4. **M3** — os textos (o mais longo, pode andar em paralelo com 2 e 3);
5. **M5 e M7** — privacidade e divisão grátis/pago, decididas antes de publicar o mapa novo.

## Decisões pendentes (do Fabiano)

1. **M0:** tirar agora da tela Lua, ascendente, planetas e casas, até o motor real existir?
2. **Motor:** próprio com Astronomy Engine (recomendado) ou Astrologer API?
3. **Textos:** quem escreve ou revisa — uma astróloga de confiança, com rascunho da IA?
4. **Planos:** o que fica no grátis e o que passa a ser pago?
