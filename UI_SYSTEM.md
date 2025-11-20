# 🚀 Locova Futuristic UI System

## Overview
Locova uses a custom futuristic design system with dark mode, neon accents, and glassmorphic elements.

## 🎨 Color Palette

### Base Colors
- **Background**: `#050813` - Deep cosmic navy-black
- **Card Background**: `#0B1020` - Dark slate-blue
- **Border**: `#1C2337` - Dim bluish-gray

### Text Colors
- **Primary Text**: `#E7ECF5` - Soft white with blue tint
- **Secondary Text**: `#94A2C2` - Muted gray-blue
- **Muted**: `#5C6785` - Tertiary labels

### Neon Accents
- **Neon Cyan**: `#1ACFF8` - Primary accent (buttons, highlights, active states)
- **Electric Violet**: `#975CFF` - Secondary accent (gradients, emphasis)
- **Neon Orange**: `#FF7A32` - Alerts, rewards, "hot" indicators

### State Colors
- **Success**: `#3ED689`
- **Warning**: `#FFB84A`
- **Error**: `#FF5C5C`

### Gradients
- **Galaxy Gradient**: `#1ACFF8` → `#975CFF` → `#FF7A32`
- **Cyan Pulse**: `#0A2A45` → `#1ACFF8`

## 🧩 Component Library

### LocovaCard
Glassmorphic card with subtle glow.
```tsx
import { LocovaCard } from '@/components/ui';

<LocovaCard glow={false}>
  <Text>Content</Text>
</LocovaCard>
```

### LocovaButton
Three variants: primary, secondary, gradient.
```tsx
import { LocovaButton } from '@/components/ui';

<LocovaButton variant="primary" onPress={handlePress}>
  Click Me
</LocovaButton>

<LocovaButton variant="gradient" loading={isLoading}>
  Submit
</LocovaButton>
```

### LocovaChip
Pill-shaped badges for categories, filters, info.
```tsx
import { LocovaChip } from '@/components/ui';

<LocovaChip variant="violet" icon="📍">
  Food
</LocovaChip>
```

### AvatarRing
Avatar with gradient ring glow.
```tsx
import { AvatarRing } from '@/components/ui';

<AvatarRing 
  size={80} 
  ringWidth={3}
  source={{ uri: avatarUrl }}
/>
```

### PointsBadge
Gradient badge for displaying points.
```tsx
import { PointsBadge } from '@/components/ui';

<PointsBadge points={150} label="Points" />
```

## 📐 Design Tokens

### Spacing
- XS: 4px
- S: 8px
- M: 12px
- L: 16px
- XL: 24px
- XXL: 32px

### Border Radius
- Small: 10px
- Medium: 14px
- Card: 16px
- Large: 20px
- Pill: 999px

### Typography
- **Display**: 28px, weight 800
- **Title**: 20px, weight 700
- **Heading**: 18px, weight 600
- **Body**: 15px, weight 400
- **Label**: 13px, weight 500
- **Caption**: 11px, weight 400

## 🎞️ Animations (Future)

### Card Entrance
- Fade in + slide up
- Duration: 190ms
- Easing: ease-out

### Button Press
- Scale: 0.97 → 1.0
- Glow increase
- Duration: 120ms

### Points Update
- Number flash (cyan/violet)
- +10 float animation

## 🎯 Usage Guidelines

### When to Use Each Button Variant
- **Primary (Cyan)**: Main actions (Submit, Save, Post)
- **Secondary (Cyan Border)**: Secondary actions (Cancel, Use Location)
- **Gradient**: Hero actions (Post Trend, Sign Up)

### Card Glow
- Use `glow={true}` for:
  - Featured content
  - Active/selected state
  - User's own content

### Color Combinations
- **Cyan + Violet**: Gradients, premium features
- **Cyan**: Interactive elements, links
- **Violet**: Categories, tags, emphasis
- **Orange**: Warnings, hot trends, rewards

## 📱 Screen-Specific Patterns

### Home/Feed
- Header with points badge
- Glass chips for location/radius
- Trend cards with violet category badges
- Floating gradient "Add Trend" button

### Leaderboard
- Cyan glow for current user row
- Top 3 with special styling
- Gradient progress indicators

### Profile
- Avatar with gradient ring
- Gradient save button
- Glass-style input fields

## 🔧 Theme Import

```tsx
import { 
  LocovaColors, 
  LocovaSpacing, 
  LocovaRadius,
  LocovaTypography,
  LocovaShadows 
} from '@/constants/locova-theme';
```

## ✨ Best Practices

1. **Consistency**: Always use theme colors, never hardcode
2. **Hierarchy**: Use text colors appropriately (text > subtext > muted)
3. **Shadows**: Apply glows sparingly for emphasis
4. **Spacing**: Use spacing tokens for consistent layout
5. **Accessibility**: Ensure sufficient contrast (cyan on dark = 7:1 ratio)

---

**Last Updated**: Implementation complete with reusable component library
