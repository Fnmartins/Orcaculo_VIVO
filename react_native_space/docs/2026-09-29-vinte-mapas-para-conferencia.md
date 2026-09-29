# Vinte mapas para conferência profissional

Gerado em 29/09/2026 pelo motor do Arcanus. **Nenhum destes nascimentos é de
pessoa real** — são datas e lugares escolhidos para cobrir o que costuma
quebrar: hemisfério norte e sul, latitude de 2° a 46°, virada de ano, horário
de verão, meia-noite, dia bissexto, equinócio, solstício e um caso sem hora.

## Por que este documento existe

`data/__tests__/bateria-mapas.test.ts` roda 141 verificações sobre estes mesmos
vinte mapas e prova que o motor **não se contradiz**: o ascendente bate por dois
caminhos independentes, as doze casas fecham 360° exatos, cúspides opostas ficam
a 180°, e todo aspecto está dentro do próprio orbe.

Consistência não é correção. Um motor pode ser perfeitamente coerente e estar
deslocado meio grau em tudo. A única conferência que resolve isso é humana:
alguém com efeméride profissional roda os mesmos nascimentos e compara.

## Como conferir

Rode cada nascimento abaixo no software de sua preferência e compare:

| O quê | Tolerância |
|---|---|
| Posição dos planetas | minutos de arco entre efemérides diferentes é normal |
| Posição da Lua | a que mais varia; alguns minutos é esperado |
| **Grau inteiro de diferença** | **não é esperado — é defeito** |
| Ascendente e meio do céu | idem: minutos sim, grau não |
| Cúspides (Placidus) | idem |
| Signos interceptados | têm de ser os mesmos |

Se algo não bater, o lugar de olhar é `data/efemerides.ts` (posições e ângulos)
ou `data/casas.ts` (cúspides).

## Orbes usados

Convenção do projeto, declarada em `data/aspectos.ts` e **aberta a revisão** —
escolas divergem e não existe medida certa:

| Aspecto | Ângulo | Orbe | Com Sol ou Lua |
|---|---|---|---|
| Conjunção | 0° | 8° | 10° |
| Oposição | 180° | 8° | 10° |
| Trígono | 120° | 7° | 8° |
| Quadratura | 90° | 7° | 8° |
| Sextil | 60° | 5° | 6° |

Se o orbe de trabalho for outro, aquela tabela é o único lugar a mudar.

## Sistema de casas

**Placidus.** Devolve nulo acima de ±66° de latitude, onde há graus do zodíaco
que não nascem nem se põem e o arco diurno deixa de existir — nenhum dos vinte
mapas abaixo cai nesse caso.

---

## Os vinte mapas

### São Paulo, tarde

13/07/1985, 18:30 — São Paulo (-23.5500, -46.6300, America/Sao_Paulo)

UTC: `1985-07-13T21:30:00.000Z` · offset -180 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 21° 24′ de Câncer | 6 |
| Lua | 3° 34′ de Gêmeos | 5 |
| Mercúrio | 17° 57′ de Leão | 7 |
| Vênus | 8° 12′ de Gêmeos | 5 |
| Marte | 22° 41′ de Câncer | 6 |
| Júpiter ℞ | 14° 41′ de Aquário | 1 |
| Saturno ℞ | 21° 35′ de Escorpião | 10 |
| Urano ℞ | 14° 36′ de Sagitário | 11 |
| Netuno ℞ | 1° 43′ de Capricórnio | 11 |
| Plutão | 1° 56′ de Escorpião | 10 |

**Ascendente** 4° 00′ de Aquário · **Meio do Céu** 29° 39′ de Libra

| Casa | Cúspide |
|---|---|
| 1 | 4° 00′ de Aquário |
| 2 | 28° 56′ de Aquário |
| 3 | 27° 31′ de Peixes |
| 4 | 29° 39′ de Áries |
| 5 | 2° 47′ de Gêmeos |
| 6 | 4° 25′ de Câncer |
| 7 | 4° 00′ de Leão |
| 8 | 28° 56′ de Leão |
| 9 | 27° 31′ de Virgem |
| 10 | 29° 39′ de Libra |
| 11 | 2° 47′ de Sagitário |
| 12 | 4° 25′ de Capricórnio |

Signos ocupados sem cúspide própria: Escorpião

| Aspecto | Orbe |
|---|---|
| jupiter sextil urano | 0.08° |
| sol trígono saturno | 0.18° |
| netuno sextil plutao | 0.22° |
| lua trígono ascendente | 0.43° |
| sol conjunção marte | 1.28° |
| marte trígono saturno | 1.10° |
| plutao conjunção meioCeu | 2.28° |
| plutao quadratura ascendente | 2.08° |
| mercurio oposição jupiter | 3.26° |
| netuno sextil meioCeu | 2.06° |

### São Paulo, horário de verão

15/01/1988, 10:00 — São Paulo (-23.5500, -46.6300, America/Sao_Paulo)

UTC: `1988-01-15T12:00:00.000Z` · offset -120 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 24° 33′ de Capricórnio | 11 |
| Lua | 3° 29′ de Sagitário | 9 |
| Mercúrio | 8° 39′ de Aquário | 11 |
| Vênus | 29° 48′ de Aquário | 12 |
| Marte | 4° 34′ de Sagitário | 9 |
| Júpiter | 21° 23′ de Áries | 2 |
| Saturno | 27° 06′ de Sagitário | 10 |
| Urano | 28° 30′ de Sagitário | 10 |
| Netuno | 8° 20′ de Capricórnio | 10 |
| Plutão | 12° 19′ de Escorpião | 9 |

**Ascendente** 9° 29′ de Peixes · **Meio do Céu** 9° 14′ de Sagitário

| Casa | Cúspide |
|---|---|
| 1 | 9° 29′ de Peixes |
| 2 | 7° 18′ de Áries |
| 3 | 7° 48′ de Touro |
| 4 | 9° 14′ de Gêmeos |
| 5 | 10° 12′ de Câncer |
| 6 | 10° 24′ de Leão |
| 7 | 9° 29′ de Virgem |
| 8 | 7° 18′ de Libra |
| 9 | 7° 48′ de Escorpião |
| 10 | 9° 14′ de Sagitário |
| 11 | 10° 12′ de Capricórnio |
| 12 | 10° 24′ de Aquário |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| ascendente quadratura meioCeu | 0.26° |
| lua conjunção marte | 1.08° |
| mercurio sextil meioCeu | 0.57° |
| saturno conjunção urano | 1.40° |
| netuno sextil ascendente | 1.16° |
| venus sextil urano | 1.29° |
| sol quadratura jupiter | 3.17° |
| plutao trígono ascendente | 2.83° |
| lua quadratura venus | 3.69° |
| mercurio quadratura plutao | 3.66° |

### Porto Alegre, madrugada

14/03/1978, 04:20 — Porto Alegre (-30.0300, -51.2300, America/Sao_Paulo)

UTC: `1978-03-14T07:20:00.000Z` · offset -180 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 23° 21′ de Peixes | 2 |
| Lua | 26° 12′ de Touro | 4 |
| Mercúrio | 7° 06′ de Áries | 2 |
| Vênus | 5° 45′ de Áries | 2 |
| Marte | 23° 06′ de Câncer | 5 |
| Júpiter | 26° 53′ de Gêmeos | 5 |
| Saturno ℞ | 25° 09′ de Leão | 6 |
| Urano ℞ | 16° 11′ de Escorpião | 9 |
| Netuno | 18° 18′ de Sagitário | 10 |
| Plutão ℞ | 15° 56′ de Libra | 8 |

**Ascendente** 25° 43′ de Aquário · **Meio do Céu** 22° 44′ de Escorpião

| Casa | Cúspide |
|---|---|
| 1 | 25° 43′ de Aquário |
| 2 | 20° 59′ de Peixes |
| 3 | 20° 21′ de Áries |
| 4 | 22° 44′ de Touro |
| 5 | 25° 33′ de Gêmeos |
| 6 | 26° 45′ de Câncer |
| 7 | 25° 43′ de Leão |
| 8 | 20° 59′ de Virgem |
| 9 | 20° 21′ de Libra |
| 10 | 22° 44′ de Escorpião |
| 11 | 25° 33′ de Sagitário |
| 12 | 26° 45′ de Capricórnio |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| sol trígono marte | 0.26° |
| marte trígono meioCeu | 0.37° |
| lua quadratura ascendente | 0.48° |
| saturno oposição ascendente | 0.56° |
| sol trígono meioCeu | 0.62° |
| lua quadratura saturno | 1.05° |
| jupiter trígono ascendente | 1.17° |
| mercurio conjunção venus | 1.36° |
| saturno quadratura meioCeu | 2.41° |
| jupiter sextil saturno | 1.73° |

### Boa Vista, quase no equador

21/06/2001, 12:00 — Boa Vista (2.8200, -60.6700, America/Boa_Vista)

UTC: `2001-06-21T16:00:00.000Z` · offset -240 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 0° 20′ de Câncer | 10 |
| Lua | 2° 36′ de Câncer | 10 |
| Mercúrio ℞ | 22° 48′ de Gêmeos | 9 |
| Vênus | 15° 08′ de Touro | 8 |
| Marte ℞ | 20° 12′ de Sagitário | 3 |
| Júpiter | 25° 10′ de Gêmeos | 9 |
| Saturno | 7° 49′ de Gêmeos | 9 |
| Urano ℞ | 24° 38′ de Aquário | 5 |
| Netuno ℞ | 8° 20′ de Aquário | 5 |
| Plutão ℞ | 13° 28′ de Sagitário | 3 |

**Ascendente** 29° 12′ de Virgem · **Meio do Céu** 29° 18′ de Gêmeos

| Casa | Cúspide |
|---|---|
| 1 | 29° 12′ de Virgem |
| 2 | 0° 59′ de Escorpião |
| 3 | 1° 02′ de Sagitário |
| 4 | 29° 18′ de Sagitário |
| 5 | 27° 32′ de Capricórnio |
| 6 | 27° 28′ de Aquário |
| 7 | 29° 12′ de Peixes |
| 8 | 0° 59′ de Touro |
| 9 | 1° 02′ de Gêmeos |
| 10 | 29° 18′ de Gêmeos |
| 11 | 27° 32′ de Câncer |
| 12 | 27° 28′ de Leão |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| ascendente quadratura meioCeu | 0.11° |
| saturno trígono netuno | 0.52° |
| jupiter trígono urano | 0.53° |
| sol conjunção meioCeu | 1.03° |
| sol quadratura ascendente | 1.14° |
| sol conjunção lua | 2.27° |
| mercurio trígono urano | 1.82° |
| mercurio conjunção jupiter | 2.36° |
| mercurio oposição marte | 2.60° |
| lua conjunção meioCeu | 3.30° |

### Manaus, quase meia-noite

03/11/1995, 23:55 — Manaus (-3.1200, -60.0200, America/Manaus)

UTC: `1995-11-04T03:55:00.000Z` · offset -240 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 11° 15′ de Escorpião | 3 |
| Lua | 4° 39′ de Áries | 8 |
| Mercúrio | 29° 40′ de Libra | 3 |
| Vênus | 0° 55′ de Sagitário | 4 |
| Marte | 10° 20′ de Sagitário | 4 |
| Júpiter | 16° 39′ de Sagitário | 5 |
| Saturno ℞ | 18° 16′ de Peixes | 8 |
| Urano | 26° 52′ de Capricórnio | 6 |
| Netuno | 23° 02′ de Capricórnio | 6 |
| Plutão | 29° 45′ de Escorpião | 4 |

**Ascendente** 8° 13′ de Leão · **Meio do Céu** 14° 07′ de Touro

| Casa | Cúspide |
|---|---|
| 1 | 8° 13′ de Leão |
| 2 | 9° 50′ de Virgem |
| 3 | 12° 47′ de Libra |
| 4 | 14° 07′ de Escorpião |
| 5 | 12° 41′ de Sagitário |
| 6 | 9° 54′ de Capricórnio |
| 7 | 8° 13′ de Aquário |
| 8 | 9° 50′ de Peixes |
| 9 | 12° 47′ de Áries |
| 10 | 14° 07′ de Touro |
| 11 | 12° 41′ de Gêmeos |
| 12 | 9° 54′ de Câncer |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| venus conjunção plutao | 1.17° |
| jupiter quadratura saturno | 1.61° |
| sol oposição meioCeu | 2.87° |
| marte trígono ascendente | 2.12° |
| sol quadratura ascendente | 3.04° |
| mercurio quadratura urano | 2.79° |
| lua trígono ascendente | 3.57° |
| lua trígono venus | 3.74° |
| urano conjunção netuno | 3.85° |
| urano sextil plutao | 2.87° |

### Londres, 51 graus norte

20/07/1969, 20:17 — Londres (51.5100, -0.1300, Europe/London)

UTC: `1969-07-20T19:17:00.000Z` · offset 60 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 27° 52′ de Câncer | 7 |
| Lua | 7° 21′ de Libra | 8 |
| Mercúrio | 25° 45′ de Câncer | 7 |
| Vênus | 15° 00′ de Gêmeos | 5 |
| Marte | 2° 46′ de Sagitário | 10 |
| Júpiter | 0° 44′ de Libra | 8 |
| Saturno | 8° 06′ de Touro | 3 |
| Urano | 0° 41′ de Libra | 8 |
| Netuno ℞ | 26° 01′ de Escorpião | 10 |
| Plutão | 23° 00′ de Virgem | 8 |

**Ascendente** 14° 37′ de Capricórnio · **Meio do Céu** 19° 57′ de Escorpião

| Casa | Cúspide |
|---|---|
| 1 | 14° 37′ de Capricórnio |
| 2 | 8° 55′ de Peixes |
| 3 | 23° 03′ de Áries |
| 4 | 19° 57′ de Touro |
| 5 | 9° 08′ de Gêmeos |
| 6 | 25° 55′ de Gêmeos |
| 7 | 14° 37′ de Câncer |
| 8 | 8° 55′ de Virgem |
| 9 | 23° 03′ de Libra |
| 10 | 19° 57′ de Escorpião |
| 11 | 9° 08′ de Sagitário |
| 12 | 25° 55′ de Sagitário |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| jupiter conjunção urano | 0.05° |
| mercurio trígono netuno | 0.27° |
| sol conjunção mercurio | 2.12° |
| sol trígono netuno | 1.85° |
| marte sextil jupiter | 2.03° |
| marte sextil urano | 2.08° |
| sol sextil urano | 2.82° |
| sol sextil jupiter | 2.87° |
| mercurio sextil plutao | 2.75° |
| netuno sextil plutao | 3.01° |

### Nova York, virada de ano

31/12/1990, 23:59 — Nova York (40.7100, -74.0100, America/New_York)

UTC: `1991-01-01T04:59:00.000Z` · offset -300 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 10° 16′ de Capricórnio | 4 |
| Lua | 16° 22′ de Câncer | 10 |
| Mercúrio ℞ | 24° 13′ de Sagitário | 3 |
| Vênus | 24° 59′ de Capricórnio | 4 |
| Marte ℞ | 27° 45′ de Touro | 8 |
| Júpiter ℞ | 11° 58′ de Leão | 10 |
| Saturno | 25° 41′ de Capricórnio | 4 |
| Urano | 9° 44′ de Capricórnio | 3 |
| Netuno | 14° 07′ de Capricórnio | 4 |
| Plutão | 19° 36′ de Escorpião | 2 |

**Ascendente** 8° 48′ de Libra · **Meio do Céu** 10° 12′ de Câncer

| Casa | Cúspide |
|---|---|
| 1 | 8° 48′ de Libra |
| 2 | 5° 32′ de Escorpião |
| 3 | 6° 24′ de Sagitário |
| 4 | 10° 12′ de Capricórnio |
| 5 | 13° 37′ de Aquário |
| 6 | 13° 32′ de Peixes |
| 7 | 8° 48′ de Áries |
| 8 | 5° 32′ de Touro |
| 9 | 6° 24′ de Gêmeos |
| 10 | 10° 12′ de Câncer |
| 11 | 13° 37′ de Leão |
| 12 | 13° 32′ de Virgem |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| sol oposição meioCeu | 0.07° |
| sol conjunção urano | 0.53° |
| urano oposição meioCeu | 0.46° |
| venus conjunção saturno | 0.70° |
| urano quadratura ascendente | 0.94° |
| sol quadratura ascendente | 1.46° |
| ascendente quadratura meioCeu | 1.40° |
| lua oposição netuno | 2.24° |
| marte trígono saturno | 2.07° |
| sol conjunção netuno | 3.86° |

### Tóquio, dia bissexto

29/02/2000, 06:00 — Tóquio (35.6800, 139.6900, Asia/Tokyo)

UTC: `2000-02-28T21:00:00.000Z` · offset 540 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 9° 35′ de Peixes | 1 |
| Lua | 28° 09′ de Sagitário | 10 |
| Mercúrio ℞ | 13° 08′ de Peixes | 1 |
| Vênus | 13° 11′ de Aquário | 12 |
| Marte | 12° 45′ de Áries | 1 |
| Júpiter | 2° 28′ de Touro | 2 |
| Saturno | 12° 19′ de Touro | 2 |
| Urano | 18° 05′ de Aquário | 12 |
| Netuno | 5° 20′ de Aquário | 12 |
| Plutão | 12° 50′ de Sagitário | 9 |

**Ascendente** 3° 14′ de Peixes · **Meio do Céu** 14° 02′ de Sagitário

| Casa | Cúspide |
|---|---|
| 1 | 3° 14′ de Peixes |
| 2 | 17° 19′ de Áries |
| 3 | 19° 32′ de Touro |
| 4 | 14° 02′ de Gêmeos |
| 5 | 6° 08′ de Câncer |
| 6 | 0° 21′ de Leão |
| 7 | 3° 14′ de Virgem |
| 8 | 17° 19′ de Libra |
| 9 | 19° 32′ de Escorpião |
| 10 | 14° 02′ de Sagitário |
| 11 | 6° 08′ de Capricórnio |
| 12 | 0° 21′ de Aquário |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| marte trígono plutao | 0.08° |
| mercurio quadratura plutao | 0.29° |
| venus sextil plutao | 0.35° |
| venus sextil marte | 0.43° |
| venus quadratura saturno | 0.87° |
| mercurio quadratura meioCeu | 0.91° |
| plutao conjunção meioCeu | 1.20° |
| jupiter sextil ascendente | 0.78° |
| mercurio sextil saturno | 0.81° |
| venus sextil meioCeu | 0.85° |

### Buenos Aires, outono

02/04/1982, 15:30 — Buenos Aires (-34.6000, -58.3800, America/Argentina/Buenos_Aires)

UTC: `1982-04-02T18:30:00.000Z` · offset -180 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 12° 41′ de Áries | 8 |
| Lua | 2° 49′ de Leão | 12 |
| Mercúrio | 3° 34′ de Áries | 8 |
| Vênus | 26° 15′ de Aquário | 7 |
| Marte ℞ | 9° 28′ de Libra | 2 |
| Júpiter ℞ | 8° 14′ de Escorpião | 3 |
| Saturno ℞ | 19° 24′ de Libra | 2 |
| Urano ℞ | 4° 23′ de Sagitário | 4 |
| Netuno ℞ | 27° 02′ de Sagitário | 5 |
| Plutão ℞ | 25° 55′ de Libra | 3 |

**Ascendente** 3° 33′ de Leão · **Meio do Céu** 22° 18′ de Touro

| Casa | Cúspide |
|---|---|
| 1 | 3° 33′ de Leão |
| 2 | 16° 18′ de Virgem |
| 3 | 23° 49′ de Libra |
| 4 | 22° 18′ de Escorpião |
| 5 | 15° 33′ de Sagitário |
| 6 | 7° 44′ de Capricórnio |
| 7 | 3° 33′ de Aquário |
| 8 | 16° 18′ de Peixes |
| 9 | 23° 49′ de Áries |
| 10 | 22° 18′ de Touro |
| 11 | 15° 33′ de Gêmeos |
| 12 | 7° 44′ de Câncer |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| mercurio trígono ascendente | 0.01° |
| venus trígono plutao | 0.34° |
| lua conjunção ascendente | 0.74° |
| lua trígono mercurio | 0.75° |
| mercurio trígono urano | 0.81° |
| urano trígono ascendente | 0.82° |
| venus sextil netuno | 0.79° |
| lua trígono urano | 1.56° |
| netuno sextil plutao | 1.12° |
| sol oposição marte | 3.22° |

### Toronto, equinócio à meia-noite

23/09/1975, 00:00 — Toronto (43.6500, -79.3800, America/Toronto)

UTC: `1975-09-23T04:00:00.000Z` · offset -240 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 29° 31′ de Virgem | 4 |
| Lua | 28° 39′ de Áries | 11 |
| Mercúrio | 23° 40′ de Libra | 5 |
| Vênus | 25° 56′ de Leão | 3 |
| Marte | 21° 21′ de Gêmeos | 12 |
| Júpiter ℞ | 22° 17′ de Áries | 11 |
| Saturno | 0° 32′ de Leão | 2 |
| Urano | 0° 47′ de Escorpião | 5 |
| Netuno | 9° 18′ de Sagitário | 6 |
| Plutão | 8° 45′ de Libra | 4 |

**Ascendente** 5° 46′ de Câncer · **Meio do Céu** 10° 30′ de Peixes

| Casa | Cúspide |
|---|---|
| 1 | 5° 46′ de Câncer |
| 2 | 24° 34′ de Câncer |
| 3 | 14° 58′ de Leão |
| 4 | 10° 30′ de Virgem |
| 5 | 15° 06′ de Libra |
| 6 | 27° 32′ de Escorpião |
| 7 | 5° 46′ de Capricórnio |
| 8 | 24° 34′ de Capricórnio |
| 9 | 14° 58′ de Aquário |
| 10 | 10° 30′ de Peixes |
| 11 | 15° 06′ de Áries |
| 12 | 27° 32′ de Touro |

Signos ocupados sem cúspide própria: Gêmeos, Sagitário

| Aspecto | Orbe |
|---|---|
| saturno quadratura urano | 0.25° |
| netuno sextil plutao | 0.55° |
| sol sextil saturno | 1.02° |
| netuno quadratura meioCeu | 1.20° |
| mercurio oposição jupiter | 1.39° |
| marte sextil jupiter | 0.92° |
| lua oposição urano | 2.14° |
| lua quadratura saturno | 1.89° |
| mercurio trígono marte | 2.31° |
| lua trígono venus | 2.72° |

### Lisboa, manhã

05/05/1964, 11:11 — Lisboa (38.7200, -9.1400, Europe/Lisbon)

UTC: `1964-05-05T10:11:00.000Z` · offset 60 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 14° 56′ de Touro | 11 |
| Lua | 20° 39′ de Aquário | 8 |
| Mercúrio ℞ | 2° 34′ de Touro | 10 |
| Vênus | 27° 36′ de Gêmeos | 12 |
| Marte | 28° 21′ de Áries | 10 |
| Júpiter | 5° 33′ de Touro | 10 |
| Saturno | 3° 42′ de Peixes | 8 |
| Urano ℞ | 5° 57′ de Virgem | 2 |
| Netuno ℞ | 16° 31′ de Escorpião | 5 |
| Plutão ℞ | 11° 40′ de Virgem | 3 |

**Ascendente** 23° 24′ de Câncer · **Meio do Céu** 7° 32′ de Áries

| Casa | Cúspide |
|---|---|
| 1 | 23° 24′ de Câncer |
| 2 | 13° 44′ de Leão |
| 3 | 7° 35′ de Virgem |
| 4 | 7° 32′ de Libra |
| 5 | 13° 48′ de Escorpião |
| 6 | 21° 04′ de Sagitário |
| 7 | 23° 24′ de Capricórnio |
| 8 | 13° 44′ de Aquário |
| 9 | 7° 35′ de Peixes |
| 10 | 7° 32′ de Áries |
| 11 | 13° 48′ de Touro |
| 12 | 21° 04′ de Gêmeos |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| jupiter trígono urano | 0.40° |
| venus sextil marte | 0.76° |
| sol oposição netuno | 1.58° |
| mercurio sextil saturno | 1.14° |
| saturno oposição urano | 2.24° |
| jupiter sextil saturno | 1.83° |
| mercurio conjunção jupiter | 2.97° |
| sol trígono plutao | 3.27° |
| mercurio trígono urano | 3.38° |
| lua quadratura netuno | 4.15° |

### Paris, verão

08/08/2010, 08:08 — Paris (48.8600, 2.3500, Europe/Paris)

UTC: `2010-08-08T06:08:00.000Z` · offset 120 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 15° 37′ de Leão | 12 |
| Lua | 19° 22′ de Câncer | 11 |
| Mercúrio | 12° 53′ de Virgem | 1 |
| Vênus | 1° 08′ de Libra | 2 |
| Marte | 5° 42′ de Libra | 2 |
| Júpiter ℞ | 3° 00′ de Áries | 8 |
| Saturno | 1° 34′ de Libra | 2 |
| Urano ℞ | 0° 09′ de Áries | 8 |
| Netuno ℞ | 27° 38′ de Aquário | 6 |
| Plutão ℞ | 3° 07′ de Capricórnio | 5 |

**Ascendente** 1° 42′ de Virgem · **Meio do Céu** 23° 23′ de Touro

| Casa | Cúspide |
|---|---|
| 1 | 1° 42′ de Virgem |
| 2 | 22° 38′ de Virgem |
| 3 | 19° 33′ de Libra |
| 4 | 23° 23′ de Escorpião |
| 5 | 0° 50′ de Capricórnio |
| 6 | 4° 19′ de Aquário |
| 7 | 1° 42′ de Peixes |
| 8 | 22° 38′ de Peixes |
| 9 | 19° 33′ de Áries |
| 10 | 23° 23′ de Touro |
| 11 | 0° 50′ de Câncer |
| 12 | 4° 19′ de Leão |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| jupiter quadratura plutao | 0.13° |
| venus conjunção saturno | 0.44° |
| venus oposição urano | 0.97° |
| saturno oposição urano | 1.41° |
| jupiter oposição saturno | 1.43° |
| plutao trígono ascendente | 1.43° |
| saturno quadratura plutao | 1.56° |
| venus oposição jupiter | 1.87° |
| venus quadratura plutao | 1.99° |
| marte oposição jupiter | 2.70° |

### Miami, primeiro minuto do ano

01/01/1999, 00:01 — Miami (25.7600, -80.1900, America/New_York)

UTC: `1999-01-01T05:01:00.000Z` · offset -300 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 10° 19′ de Capricórnio | 4 |
| Lua | 28° 02′ de Gêmeos | 9 |
| Mercúrio | 21° 34′ de Sagitário | 3 |
| Vênus | 25° 39′ de Capricórnio | 4 |
| Marte | 18° 29′ de Libra | 1 |
| Júpiter | 21° 58′ de Peixes | 6 |
| Saturno | 26° 46′ de Áries | 7 |
| Urano | 10° 58′ de Aquário | 5 |
| Netuno | 1° 04′ de Aquário | 4 |
| Plutão | 9° 07′ de Sagitário | 3 |

**Ascendente** 4° 56′ de Libra · **Meio do Céu** 5° 01′ de Câncer

| Casa | Cúspide |
|---|---|
| 1 | 4° 56′ de Libra |
| 2 | 3° 32′ de Escorpião |
| 3 | 3° 55′ de Sagitário |
| 4 | 5° 01′ de Capricórnio |
| 5 | 6° 14′ de Aquário |
| 6 | 6° 40′ de Peixes |
| 7 | 4° 56′ de Áries |
| 8 | 3° 32′ de Touro |
| 9 | 3° 55′ de Gêmeos |
| 10 | 5° 01′ de Câncer |
| 11 | 6° 14′ de Leão |
| 12 | 6° 40′ de Virgem |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| ascendente quadratura meioCeu | 0.09° |
| mercurio quadratura jupiter | 0.41° |
| venus quadratura saturno | 1.13° |
| lua sextil saturno | 1.26° |
| urano sextil plutao | 1.84° |
| sol oposição meioCeu | 5.30° |
| netuno trígono ascendente | 3.86° |
| saturno quadratura netuno | 4.30° |
| mercurio sextil marte | 3.08° |
| lua oposição mercurio | 6.47° |

### Montreal, solstício de inverno

21/12/1988, 18:45 — Montreal (45.5000, -73.5700, America/Toronto)

UTC: `1988-12-21T23:45:00.000Z` · offset -300 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 0° 21′ de Capricórnio | 5 |
| Lua | 14° 55′ de Gêmeos | 11 |
| Mercúrio | 11° 50′ de Capricórnio | 6 |
| Vênus | 5° 17′ de Sagitário | 5 |
| Marte | 15° 17′ de Áries | 10 |
| Júpiter ℞ | 27° 32′ de Touro | 11 |
| Saturno | 4° 25′ de Capricórnio | 6 |
| Urano | 1° 09′ de Capricórnio | 6 |
| Netuno | 9° 33′ de Capricórnio | 6 |
| Plutão | 14° 16′ de Escorpião | 4 |

**Ascendente** 2° 26′ de Leão · **Meio do Céu** 14° 36′ de Áries

| Casa | Cúspide |
|---|---|
| 1 | 2° 26′ de Leão |
| 2 | 21° 11′ de Leão |
| 3 | 14° 18′ de Virgem |
| 4 | 14° 36′ de Libra |
| 5 | 22° 26′ de Escorpião |
| 6 | 0° 49′ de Capricórnio |
| 7 | 2° 26′ de Aquário |
| 8 | 21° 11′ de Aquário |
| 9 | 14° 18′ de Peixes |
| 10 | 14° 36′ de Áries |
| 11 | 22° 26′ de Touro |
| 12 | 0° 49′ de Câncer |

Signos ocupados sem cúspide própria: Gêmeos, Sagitário

| Aspecto | Orbe |
|---|---|
| lua sextil meioCeu | 0.32° |
| lua sextil marte | 0.37° |
| sol conjunção urano | 0.80° |
| marte conjunção meioCeu | 0.69° |
| mercurio conjunção netuno | 2.30° |
| mercurio quadratura meioCeu | 2.76° |
| sol conjunção saturno | 4.06° |
| saturno conjunção urano | 3.26° |
| venus trígono ascendente | 2.86° |
| mercurio sextil plutao | 2.43° |

### Madri, outono

10/10/1972, 10:10 — Madri (40.4200, -3.7000, Europe/Madrid)

UTC: `1972-10-10T09:10:00.000Z` · offset 60 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 17° 10′ de Libra | 11 |
| Lua | 20° 46′ de Escorpião | 1 |
| Mercúrio | 1° 25′ de Escorpião | 12 |
| Vênus | 5° 47′ de Virgem | 10 |
| Marte | 6° 05′ de Libra | 11 |
| Júpiter | 1° 39′ de Capricórnio | 2 |
| Saturno ℞ | 20° 33′ de Gêmeos | 8 |
| Urano | 18° 36′ de Libra | 11 |
| Netuno | 3° 20′ de Sagitário | 1 |
| Plutão | 2° 29′ de Libra | 10 |

**Ascendente** 19° 37′ de Escorpião · **Meio do Céu** 0° 49′ de Virgem

| Casa | Cúspide |
|---|---|
| 1 | 19° 37′ de Escorpião |
| 2 | 19° 38′ de Sagitário |
| 3 | 24° 31′ de Capricórnio |
| 4 | 0° 49′ de Peixes |
| 5 | 2° 47′ de Áries |
| 6 | 28° 34′ de Áries |
| 7 | 19° 37′ de Touro |
| 8 | 19° 38′ de Gêmeos |
| 9 | 24° 31′ de Câncer |
| 10 | 0° 49′ de Virgem |
| 11 | 2° 47′ de Libra |
| 12 | 28° 34′ de Libra |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| mercurio sextil jupiter | 0.23° |
| lua conjunção ascendente | 1.16° |
| jupiter trígono meioCeu | 0.83° |
| mercurio sextil meioCeu | 0.59° |
| jupiter quadratura plutao | 0.84° |
| sol conjunção urano | 1.44° |
| netuno sextil plutao | 0.85° |
| saturno trígono urano | 1.94° |
| venus quadratura netuno | 2.45° |
| netuno quadratura meioCeu | 2.52° |

### Recife, equinócio de madrugada

20/03/2005, 03:03 — Recife (-8.0500, -34.8800, America/Recife)

UTC: `2005-03-20T06:03:00.000Z` · offset -180 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 29° 44′ de Peixes | 2 |
| Lua | 26° 25′ de Câncer | 6 |
| Mercúrio ℞ | 14° 06′ de Áries | 2 |
| Vênus | 26° 58′ de Peixes | 2 |
| Marte | 29° 38′ de Capricórnio | 12 |
| Júpiter ℞ | 15° 47′ de Libra | 8 |
| Saturno ℞ | 20° 24′ de Câncer | 5 |
| Urano | 8° 03′ de Peixes | 1 |
| Netuno | 16° 39′ de Aquário | 12 |
| Plutão | 24° 30′ de Sagitário | 10 |

**Ascendente** 23° 23′ de Aquário · **Meio do Céu** 26° 04′ de Escorpião

| Casa | Cúspide |
|---|---|
| 1 | 23° 23′ de Aquário |
| 2 | 23° 27′ de Peixes |
| 3 | 25° 07′ de Áries |
| 4 | 26° 04′ de Touro |
| 5 | 25° 20′ de Gêmeos |
| 6 | 23° 58′ de Câncer |
| 7 | 23° 23′ de Leão |
| 8 | 23° 27′ de Virgem |
| 9 | 25° 07′ de Libra |
| 10 | 26° 04′ de Escorpião |
| 11 | 25° 20′ de Sagitário |
| 12 | 23° 58′ de Capricórnio |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| sol sextil marte | 0.09° |
| lua trígono meioCeu | 0.35° |
| lua trígono venus | 0.56° |
| jupiter trígono netuno | 0.87° |
| venus trígono meioCeu | 0.91° |
| mercurio oposição jupiter | 1.68° |
| plutao sextil ascendente | 1.11° |
| sol conjunção venus | 2.76° |
| lua oposição marte | 3.22° |
| venus quadratura plutao | 2.47° |

### Curitiba, noite de inverno

30/06/1993, 21:00 — Curitiba (-25.4300, -49.2700, America/Sao_Paulo)

UTC: `1993-07-01T00:00:00.000Z` · offset -180 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 9° 11′ de Câncer | 5 |
| Lua | 2° 01′ de Sagitário | 10 |
| Mercúrio | 28° 15′ de Câncer | 6 |
| Vênus | 24° 38′ de Touro | 4 |
| Marte | 4° 27′ de Virgem | 7 |
| Júpiter | 6° 03′ de Libra | 8 |
| Saturno ℞ | 29° 59′ de Aquário | 1 |
| Urano ℞ | 20° 40′ de Capricórnio | 11 |
| Netuno ℞ | 20° 04′ de Capricórnio | 11 |
| Plutão ℞ | 23° 01′ de Escorpião | 10 |

**Ascendente** 24° 02′ de Aquário · **Meio do Céu** 22° 12′ de Escorpião

| Casa | Cúspide |
|---|---|
| 1 | 24° 02′ de Aquário |
| 2 | 20° 14′ de Peixes |
| 3 | 20° 05′ de Áries |
| 4 | 22° 12′ de Touro |
| 5 | 24° 15′ de Gêmeos |
| 6 | 24° 55′ de Câncer |
| 7 | 24° 02′ de Leão |
| 8 | 20° 14′ de Virgem |
| 9 | 20° 05′ de Libra |
| 10 | 22° 12′ de Escorpião |
| 11 | 24° 15′ de Sagitário |
| 12 | 24° 55′ de Capricórnio |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| urano conjunção netuno | 0.60° |
| venus quadratura ascendente | 0.60° |
| plutao conjunção meioCeu | 0.81° |
| plutao quadratura ascendente | 1.03° |
| venus oposição plutao | 1.63° |
| lua quadratura saturno | 2.04° |
| ascendente quadratura meioCeu | 1.83° |
| venus oposição meioCeu | 2.44° |
| lua quadratura marte | 2.44° |
| urano sextil meioCeu | 1.53° |

### Salvador, tarde

14/02/1968, 14:14 — Salvador (-12.9700, -38.5000, America/Bahia)

UTC: `1968-02-14T16:14:00.000Z` · offset -120 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 25° 03′ de Aquário | 9 |
| Lua | 0° 07′ de Virgem | 3 |
| Mercúrio ℞ | 27° 06′ de Aquário | 9 |
| Vênus | 23° 12′ de Capricórnio | 8 |
| Marte | 28° 07′ de Peixes | 10 |
| Júpiter ℞ | 1° 38′ de Virgem | 3 |
| Saturno | 9° 25′ de Áries | 10 |
| Urano ℞ | 28° 28′ de Virgem | 4 |
| Netuno | 26° 29′ de Escorpião | 6 |
| Plutão ℞ | 22° 13′ de Virgem | 4 |

**Ascendente** 14° 35′ de Gêmeos · **Meio do Céu** 17° 46′ de Peixes

| Casa | Cúspide |
|---|---|
| 1 | 14° 35′ de Gêmeos |
| 2 | 13° 52′ de Câncer |
| 3 | 15° 00′ de Leão |
| 4 | 17° 46′ de Virgem |
| 5 | 19° 40′ de Libra |
| 6 | 18° 28′ de Escorpião |
| 7 | 14° 35′ de Sagitário |
| 8 | 13° 52′ de Capricórnio |
| 9 | 15° 00′ de Aquário |
| 10 | 17° 46′ de Peixes |
| 11 | 19° 40′ de Áries |
| 12 | 18° 28′ de Touro |

Signos ocupados sem cúspide própria: nenhum

| Aspecto | Orbe |
|---|---|
| marte oposição urano | 0.35° |
| mercurio quadratura netuno | 0.62° |
| venus trígono plutao | 0.99° |
| lua conjunção jupiter | 1.53° |
| sol quadratura netuno | 1.44° |
| sol conjunção mercurio | 2.06° |
| marte trígono netuno | 1.63° |
| lua oposição mercurio | 3.01° |
| urano sextil netuno | 1.99° |
| lua quadratura netuno | 3.63° |

### Boston, manhã de novembro

08/11/2015, 07:30 — Boston (42.3600, -71.0600, America/New_York)

UTC: `2015-11-08T12:30:00.000Z` · offset -300 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 15° 46′ de Escorpião | 12 |
| Lua | 10° 26′ de Libra | 10 |
| Mercúrio | 10° 16′ de Escorpião | 12 |
| Vênus | 29° 52′ de Virgem | 10 |
| Marte | 27° 21′ de Virgem | 10 |
| Júpiter | 17° 58′ de Virgem | 10 |
| Saturno | 4° 56′ de Sagitário | 1 |
| Urano ℞ | 17° 27′ de Áries | 5 |
| Netuno ℞ | 7° 03′ de Peixes | 3 |
| Plutão | 13° 28′ de Capricórnio | 2 |

**Ascendente** 27° 13′ de Escorpião · **Meio do Céu** 12° 27′ de Virgem

| Casa | Cúspide |
|---|---|
| 1 | 27° 13′ de Escorpião |
| 2 | 28° 27′ de Sagitário |
| 3 | 5° 23′ de Aquário |
| 4 | 12° 27′ de Peixes |
| 5 | 13° 17′ de Áries |
| 6 | 7° 25′ de Touro |
| 7 | 27° 13′ de Touro |
| 8 | 28° 27′ de Gêmeos |
| 9 | 5° 23′ de Leão |
| 10 | 12° 27′ de Virgem |
| 11 | 13° 17′ de Libra |
| 12 | 7° 25′ de Escorpião |

Signos ocupados sem cúspide própria: Capricórnio

| Aspecto | Orbe |
|---|---|
| marte sextil ascendente | 0.13° |
| plutao trígono meioCeu | 1.01° |
| saturno quadratura netuno | 2.12° |
| venus conjunção marte | 2.51° |
| sol sextil jupiter | 2.19° |
| lua quadratura plutao | 3.03° |
| sol sextil plutao | 2.31° |
| mercurio sextil meioCeu | 2.19° |
| mercurio trígono netuno | 3.21° |
| venus sextil ascendente | 2.64° |

### São Paulo, sem hora conhecida

13/07/1985, hora desconhecida — São Paulo (-23.5500, -46.6300, America/Sao_Paulo)

UTC: `1985-07-13T15:00:00.000Z` · offset -180 min

| Corpo | Posição | Casa |
|---|---|---|
| Sol | 21° 09′ de Câncer | — |
| Lua | 0° 18′ de Gêmeos | — |
| Mercúrio | 17° 41′ de Leão | — |
| Vênus | 7° 54′ de Gêmeos | — |
| Marte | 22° 31′ de Câncer | — |
| Júpiter ℞ | 14° 43′ de Aquário | — |
| Saturno ℞ | 21° 35′ de Escorpião | — |
| Urano ℞ | 14° 37′ de Sagitário | — |
| Netuno ℞ | 1° 43′ de Capricórnio | — |
| Plutão | 1° 56′ de Escorpião | — |

*Sem hora de nascimento: não há ascendente, meio do céu nem casas.*

| Aspecto | Orbe |
|---|---|
| jupiter sextil urano | 0.10° |
| netuno sextil plutao | 0.21° |
| sol trígono saturno | 0.44° |
| marte trígono saturno | 0.92° |
| sol conjunção marte | 1.37° |
| mercurio oposição jupiter | 2.97° |
| mercurio trígono urano | 3.07° |
| mercurio quadratura saturno | 3.90° |
| lua conjunção venus | 7.59° |
| venus oposição urano | 6.71° |
