# 🎨 Oráculo Vivo — Design System (Figma Handoff)

Guia completo para redesign no Figma mantendo a identidade visual do app.

---

## 🎨 Cores (Color Styles no Figma)

### Principais
| Nome | HEX | Uso |
|------|-----|-----|
| Primária | `#7C9A82` | Verde-sálvia — cor institucional, botões secundários |
| Acento | `#D4AF37` | Dourado místico — CTAs, destaques, ícones premium |
| Secundária | `#87CEEB` | Azul-céu — apoio, energia leve |
| Roxo Místico | `#4B0082` | Base espiritual, gradientes |
| Fundo Escuro | `#1A1A2E` | Background principal (dark) |
| Fundo Claro | `#F5F0E8` | Off-white quente (light) |
| Superfície | `#F9F6F0` | Cards em modo claro |

### Texto
| Nome | HEX |
|------|-----|
| Texto Primário | `#2D2D3A` |
| Texto Secundário | `#6B6B7B` |
| Texto Claro | `#F5F0E8` |

### Status
| Nome | HEX |
|------|-----|
| Erro | `#D94F4F` |

### Cores dos Oráculos (ícones no grid)
| Oráculo | HEX |
|---------|-----|
| Búzios | `#7C9A82` |
| Tarot | `#9B59B6` |
| Numerologia | `#3498DB` |
| Mapa Astral | `#E67E22` |
| Café | `#8B4513` |
| Quiromancia | `#E74C3C` |
| Matriz do Destino | `#B565A7` |
| Lei da Atração | `#EC4899` |

### Gradientes
| Nome | Stops | Uso |
|------|-------|-----|
| Primário | `#4B0082` → `#1A1A2E` | Botões principais |
| Acento | `#D4AF37` → `#C49B30` | CTAs premium |
| Bem-Estar | `#7C9A82` → `#87CEEB` | Rituais |
| Fundo | `#1A1A2E` → `#2D1B4E` → `#1A1A2E` | Background de telas |
| Mapa Numerológico | `rgba(212,175,55,0.25)` → `rgba(75,0,130,0.25)` | Card premium |
| Lei da Atração | `rgba(236,72,153,0.25)` → `rgba(212,175,55,0.20)` | Card destaque |

### Transparências (Glass)
| Uso | Valor |
|-----|-------|
| Card fundo | `rgba(245,240,232,0.08)` |
| Card borda | `rgba(212,175,55,0.15)` |
| Input fundo | `rgba(245,240,232,0.06)` |
| Input borda | `rgba(245,240,232,0.15)` |

---

## ✍️ Tipografia (Text Styles no Figma)

**Fontes (Google Fonts):**
- **Display/Títulos:** [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (700 Bold, 600 SemiBold)
- **Corpo:** [Nunito](https://fonts.google.com/specimen/Nunito) (400 Regular, 600 SemiBold, 700 Bold)

**Escala:**
| Estilo | Fonte | Tamanho | Peso |
|--------|-------|---------|------|
| Display | Playfair Display | 36px | 700 |
| H1 | Playfair Display | 28px | 700 |
| H2 | Playfair Display | 24px | 600 |
| H3 | Playfair Display | 20px | 600 |
| Corpo | Nunito | 16px | 400 |
| Corpo Pequeno | Nunito | 14px | 400 |
| Legenda | Nunito | 12px | 400 |
| Botão | Nunito | 16px | 700 |

---

## 📏 Espaçamento (Grade 8pt)

| Token | Valor |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |

---

## 🔲 Border Radius (Effect Styles)

| Token | Valor |
|-------|-------|
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 24px |
| full | 9999px (pill/circle) |

---

## 🧩 Componentes principais

### Botão Primário
- Fill: Gradiente Acento (`#D4AF37` → `#C49B30`)
- Radius: 16px (lg)
- Padding: 16px vertical, 24px horizontal
- Texto: Nunito Bold 16px, cor `#1A1A2E`
- Ícone opcional à esquerda (20px)

### Botão Secundário
- Fill: `rgba(245,240,232,0.08)`
- Borda: 1px `rgba(212,175,55,0.15)`
- Radius: 16px
- Texto: Nunito SemiBold 16px, cor `#F5F0E8`

### Card Padrão
- Fill: `rgba(245,240,232,0.08)` (glass)
- Borda: 1px `rgba(212,175,55,0.15)`
- Radius: 16-24px
- Padding: 16-24px
- Shadow (light mode): `0 2px 8px rgba(0,0,0,0.08)`

### Card Premium (destaque)
- Fill: Gradiente (ex: Mapa Numerológico ou Lei da Atração)
- Ícone: 32px em círculo tint
- Título + descrição
- Chevron à direita

### Input
- Fill: `rgba(245,240,232,0.06)`
- Borda: 1px `rgba(245,240,232,0.15)`
- Radius: 12px
- Altura: 48-56px
- Focus: borda dourada (`#D4AF37`)

### Chip/Tag
- Fill: cor do oráculo com 20% opacidade
- Borda: 1px cor do oráculo com 30% opacidade
- Radius: 9999px (full)
- Padding: 6px 12px
- Texto: 12-14px SemiBold

### Tab Bar (bottom)
- Fundo: `rgba(26,26,46,0.95)` + blur
- Altura: 60px + safe area
- 4 abas: Início, Consultas, Jornada, Perfil
- Ícone ativo: `#D4AF37` / inativo: `#6B6B7B`

---

## 📱 Telas para redesenhar

1. **Onboarding** (3 passos: caminho / intenção / formato)
2. **Home** — hero + grid Oráculos + cards premium + rituais
3. **Consulta Búzios** — preparo → jogo → resultado
4. **Consulta Tarot** — preparo → cartas → resultado
5. **Numerologia** (rápida) — form → cálculo → resultado
6. **Mapa Numerológico** (premium) — form → calculando → resultado (4 abas)
7. **Mapa Astral** — placeholder
8. **Matriz do Destino** — form → calculando → resultado
9. **Lei da Atração** — cofre → novo desejo → ritual (5 fases) → detalhe
10. **IA Visual** (café/quiromancia) — captura → processando → resultado
11. **Consultas ao vivo** — lista oraculistas → modal agendamento
12. **Jornada** — stats + histórico
13. **Perfil** — dados + configurações
14. **Planos** — freemium / mensal / anual

---

## 🎯 Princípios de Design

- **Dark mode primeiro** — background gradiente escuro é a base
- **Glass morphism** — cards translúcidos com borda sutil dourada
- **Dourado como acento** — usar em 2-3 pontos por tela pra coesão
- **Serifada + Sans** — Playfair (títulos místicos) + Nunito (corpo legível)
- **8pt grid** — todo espaçamento múltiplo de 8
- **Toques mínimos** — 44×44pt (iOS) / 48×48dp (Android)
- **Micro-interações** — botão scale 0.97 no press, fade-in em listas

---

## 🛠️ Setup no Figma

1. Crie um arquivo novo: **Oráculo Vivo — Design System**
2. Frame 1: **Color Styles** — cadastre todas as cores acima como estilos
3. Frame 2: **Text Styles** — cadastre a escala tipográfica
4. Frame 3: **Components** — botões, cards, inputs, chips como componentes
5. Frame 4: **Icons** — importe [Material Community Icons](https://pictogrammers.com/library/mdi/) e [Ionicons](https://ionic.io/ionicons)
6. Frames 5+: **Screens** — uma página por fluxo

**Plugin recomendado:** `html.to.design` para importar as telas atuais do preview e usá-las como referência.
