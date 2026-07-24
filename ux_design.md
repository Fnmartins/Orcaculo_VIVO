# Oráculo Vivo — UX Specification

## Design Direction

### Color Palette
- **Primary**: Verde Sálvia `#7C9A82` (sage green)
- **Accent**: Dourado `#D4AF37` (gold)
- **Secondary**: Azul Céu `#87CEEB` (sky blue)
- **Mystic Purple**: Roxo Escuro `#4B0082` (indigo)
- **Background Light**: Bege Claro `#F5F0E8`
- **Background Dark**: Preto Elegante `#1A1A2E`
- **Surface**: `#F9F6F0` (warm off-white)
- **Text Primary**: `#2D2D3A`
- **Text Secondary**: `#6B6B7B`
- **Text Light**: `#F5F0E8`
- **Error**: `#D94F4F`
- **Gradient Primary**: `[#4B0082, #1A1A2E]` (mystic dark gradient)
- **Gradient Accent**: `[#D4AF37, #C49B30]` (gold gradient)
- **Gradient Wellness**: `[#7C9A82, #87CEEB]` (sage to sky)
- **Gradient Background**: `[#1A1A2E, #2D1B4E, #1A1A2E]` (deep mystic)

### Typography
- **Display Font**: `Playfair Display` (Google Fonts) — elegant serif for titles and mystical headings
- **Body Font**: `Nunito` (Google Fonts) — clean, rounded, friendly for body text
- **Type Scale**:
  - Display: Playfair Display, 36px, bold
  - Heading 1: Playfair Display, 28px, bold
  - Heading 2: Playfair Display, 24px, semibold
  - Heading 3: Playfair Display, 20px, semibold
  - Body: Nunito, 16px, regular
  - Body Small: Nunito, 14px, regular
  - Caption: Nunito, 12px, regular
  - Button: Nunito, 16px, bold

### Backgrounds
- Layered gradients: deep mystic purple-to-dark base with subtle radial gold glow overlays
- Organic texture: subtle star-field or constellation dot pattern at low opacity (5-10%) over gradients
- Cards use semi-transparent surfaces with soft blur (glass effect)

---

## Screens

### 1. Splash Screen
**Route**: `app/index.tsx`
**Purpose**: Animated mystical entry that auto-transitions to Welcome after animation completes.

**Layout**:
- Full-screen `GradientBackground` using `Gradient Background` palette `[#1A1A2E, #2D1B4E, #1A1A2E]`
- Centered content, vertically and horizontally

**Key UI Elements**:
- **Mystic Symbol**: A stylized eye/oracle icon (use a custom SVG or an icon from `@expo/vector-icons` MaterialCommunityIcons `eye-outline` or `crystal-ball` styled). Size 120x120px, color Dourado `#D4AF37`
- **Animated Glow Ring**: A circular ring around the symbol that pulses with a soft gold glow animation (opacity 0.3→0.8→0.3, 2s loop)
- **App Title**: "Oráculo Vivo" in Playfair Display, 36px, color `#F5F0E8`, appears with fade-in after 500ms
- **Subtitle**: "Desperte sua intuição" in Nunito, 14px, color `#D4AF37` at 70% opacity, fades in after 800ms
- **Particle Effect**: 8-12 small gold dots (3-5px) scattered around the symbol, slowly drifting upward with fade (simulated with Animated API, absolute positioned views)

**Animations**:
1. Symbol scales from 0.5→1.0 with spring (damping 12, stiffness 100) over 600ms
2. Glow ring fades in at 300ms, begins pulsing
3. Title fades in + slides up 20px at 500ms (duration 400ms)
4. Subtitle fades in at 800ms (duration 300ms)
5. Particles begin drifting at 400ms
6. After 2500ms total, entire screen fades out (opacity 1→0, 400ms)
7. After fade-out completes, navigate to Welcome screen via `router.replace('/welcome')`

**User Actions**: None (auto-advancing)

---

### 2. Welcome Screen
**Route**: `app/welcome.tsx`
**Purpose**: Elegant onboarding entry point introducing the app and inviting the user to begin.

**Layout**:
- Full-screen `GradientBackground` using `[#1A1A2E, #2D1B4E, #1A1A2E]`
- Content arranged vertically: top section (decorative), middle section (text), bottom section (CTA)
- SafeAreaView with padding horizontal 24px

**Key UI Elements**:

*Top Section (flex 2)*:
- **Hero Illustration Area**: Centered mystic symbol (same eye/oracle icon as splash), size 100x100px, Dourado color, with a subtle continuous slow rotation animation (360° over 20s, linear, infinite loop) — gives a living/breathing feel
- **Decorative Stars**: 5-6 small star icons (`Ionicons star`) scattered around the hero at various sizes (8-16px), Dourado at 30-60% opacity, with gentle twinkle animation (opacity oscillation, staggered start times)
- **Radial Glow**: Behind the hero icon, a radial gradient circle (Dourado at 10% opacity, 200px diameter) providing a warm halo

*Middle Section (flex 2)*:
- **Title**: "Oráculo Vivo" — Playfair Display, 36px, bold, color `#F5F0E8`, center-aligned
- **Divider**: A thin horizontal line (1px, 60px wide, Dourado at 50% opacity) centered below title, margin vertical 16px
- **Tagline**: "Sua jornada de autoconhecimento começa aqui" — Nunito, 18px, color `#F5F0E8` at 85% opacity, center-aligned, line-height 26px
- **Description**: "Conecte-se com a sabedoria ancestral através da inteligência artificial. Descubra respostas, encontre clareza e desperte sua intuição interior." — Nunito, 14px, color `#6B6B7B`, center-aligned, line-height 22px, marginTop 12px

*Bottom Section (flex 1, justifyContent flex-end, paddingBottom 40px)*:
- **CTA Button**: "Começar Jornada" — Primary variant button with gradient `[#D4AF37, #C49B30]`, full width, height 56px, border-radius 16px, text Nunito 16px bold color `#1A1A2E`. Icon: `Ionicons arrow-forward` to the right of text.
- **Version Text**: "v1.0.0" — Nunito, 12px, color `#6B6B7B` at 50% opacity, center-aligned, marginTop 16px

**Animations**:
1. Hero icon fades in + scales from 0.8→1.0 (spring, 500ms)
2. Stars twinkle with staggered opacity animations
3. Title slides up 30px + fades in at 300ms
4. Divider width animates from 0→60px at 500ms
5. Tagline fades in at 600ms
6. Description fades in at 800ms
7. CTA button slides up 40px + fades in at 1000ms
8. CTA button has continuous subtle glow pulse on the border (Dourado shadow opacity 0.2→0.5→0.2, 3s loop)

**User Actions**:
- Tap "Começar Jornada" → Currently shows an alert or navigates to a placeholder home. Since this is the base structure phase, tapping the button triggers a brief haptic feedback (medium impact) and displays a styled modal/bottom-sheet or alert: "Em breve! As consultas oraculares estão sendo preparadas para você." with a "Entendi" dismiss button. This keeps the app functional without dead-ending.

---

## Reusable Components

### GradientBackground
- Wraps children in a `LinearGradient` (expo-linear-gradient)
- Props: `colors?: string[]` (default: `[#1A1A2E, #2D1B4E, #1A1A2E]`), `style?: ViewStyle`, `children: ReactNode`
- Covers full screen, includes SafeAreaView option

### Button
- Variants: `primary` (gold gradient fill, dark text), `secondary` (sage green fill, light text), `outline` (transparent with Dourado border, Dourado text), `ghost` (transparent, Dourado text)
- Props: `variant`, `label: string`, `onPress`, `loading?: boolean`, `disabled?: boolean`, `icon?: string` (Ionicons name), `iconPosition?: 'left' | 'right'`, `fullWidth?: boolean`
- Height: 56px (primary/secondary), 48px (outline/ghost)
- Border radius: 16px
- Press animation: scale 0.97 with spring + haptic feedback (medium)
- Loading state: ActivityIndicator replacing text, matching text color
- Disabled state: opacity 0.5, no press animation

### Card
- Semi-transparent background `rgba(245, 240, 232, 0.08)` with backdrop blur if supported
- Border: 1px `rgba(212, 175, 55, 0.15)` (subtle gold border)
- Border radius: 16px
- Padding: 20px
- Props: `children`, `style?: ViewStyle`, `onPress?: () => void`
- If `onPress` provided: press animation scale 0.98 with spring
- Subtle shadow: `#D4AF37` at 5% opacity, offset 0/4, blur 12

### Input
- Floating label pattern
- Background: `rgba(245, 240, 232, 0.06)`
- Border: 1px `rgba(245, 240, 232, 0.15)`, focus border `#D4AF37`
- Border radius: 12px
- Height: 56px
- Text color: `#F5F0E8`, placeholder color: `#6B6B7B`
- Font: Nunito 16px
- Props: `label: string`, `value: string`, `onChangeText`, `placeholder?: string`, `secureTextEntry?: boolean`, `error?: string`, `leftIcon?: string`
- Focus animation: label floats up, border color transitions to gold
- Error state: border color `#D94F4F`, error message below in Nunito 12px `#D94F4F`, subtle shake animation (translateX -5→5→-3→3→0, 300ms)

### Loading
- Centered mystic loading indicator
- A gold oracle eye icon that pulses (scale 0.9→1.1→0.9, opacity 0.5→1→0.5, 1.5s loop)
- Below icon: "Consultando os astros..." text in Nunito 14px, `#D4AF37` at 70% opacity, with ellipsis animation (dots appear one by one)
- Props: `message?: string` (overrides default text), `size?: 'small' | 'large'`
- Small variant: just the pulsing icon, 40px, no text

---

## Navigation

### Structure
This is a minimal two-screen app (Splash → Welcome) with no authentication and no tabs.

### File Structure
```
app/
  _layout.tsx        — Root layout: loads fonts (Playfair Display, Nunito) via expo-font/useFonts, shows app-level Loading component until fonts ready, renders <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
  index.tsx           — Splash Screen (auto-advances to /welcome after 2.9s)
  welcome.tsx         — Welcome Screen
components/
  Button.tsx
  Card.tsx
  Input.tsx
  Loading.tsx
  GradientBackground.tsx
constants/
  colors.ts           — All color tokens exported as named constants
  typography.ts       — Font family names, type scale objects
  theme.ts            — Combined theme object (colors + typography + spacing + borderRadius)
  spacing.ts          — 8pt grid spacing scale: xs:4, sm:8, md:16, lg:24, xl:32, xxl:48
hooks/
  useAnimatedEntry.ts — Reusable hook returning Animated.Value + trigger for fade-in + slide-up pattern
types/
  theme.ts            — TypeScript interfaces for Theme, Colors, Typography
utils/
  haptics.ts          — Wrapper around expo-haptics with web no-op fallback
assets/
  fonts/              — (fonts loaded via expo-google-fonts packages, not local files)
```

### Navigation Flow
1. App opens → `_layout.tsx` loads fonts → shows Loading component while fonts load
2. Fonts ready → renders `index.tsx` (Splash Screen)
3. Splash animation plays for ~2.9s → `router.replace('/welcome')`
4. Welcome Screen displayed with entry animations
5. "Começar Jornada" tap → shows "coming soon" styled alert (placeholder for future navigation)

### Transitions
- Splash → Welcome: fade transition (configured in Stack screenOptions)
- All transitions use `animation: 'fade'` for the mystical feel

---

## Animation & Motion Summary

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Splash symbol | scale 0.5→1.0 | 600ms | spring (damping 12) |
| Splash glow ring | opacity pulse 0.3→0.8→0.3 | 2000ms loop | ease-in-out |
| Splash title | fade-in + translateY -20 | 400ms | ease-out |
| Splash exit | opacity 1→0 | 400ms | ease-in |
| Welcome hero | fade-in + scale 0.8→1.0 | 500ms | spring |
| Welcome hero rotation | rotate 0→360° | 20000ms loop | linear |
| Welcome stars | opacity twinkle | 2000-3000ms loop | ease-in-out |
| Welcome title | fade-in + translateY -30 | 400ms | ease-out |
| Welcome divider | width 0→60 | 300ms | ease-out |
| Welcome CTA | fade-in + translateY -40 | 400ms | ease-out |
| Welcome CTA glow | shadow opacity pulse | 3000ms loop | ease-in-out |
| Button press | scale 1→0.97 | 100ms | spring |
| Card press | scale 1→0.98 | 100ms | spring |
| Loading icon | scale+opacity pulse | 1500ms loop | ease-in-out |

All animations respect `AccessibilityInfo.isReduceMotionEnabled` — when true, skip all animations and show final states immediately.

---

## Accessibility
- All interactive elements have `accessibilityLabel` and `accessibilityRole`
- Touch targets minimum 44pt
- Color contrast: gold `#D4AF37` on dark `#1A1A2E` = ~5.2:1 ✓; light text `#F5F0E8` on dark `#1A1A2E` = ~12:1 ✓
- Screen reader: Splash auto-announces "Oráculo Vivo, carregando"; Welcome announces title and button
- Reduce motion: all animations disabled, content appears immediately

## Idioma
Todos os textos visíveis ao usuário devem estar em **português brasileiro**.