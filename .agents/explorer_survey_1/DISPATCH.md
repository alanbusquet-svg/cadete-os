## 2026-08-26T23:42:00Z
Survey the existing codebase and map the technical implementation requirements for:
- Overall frontend architecture (React + Vite + TypeScript + Tailwind CSS, App.tsx, Layout, Views, Navigation).
- Requirement R1: Responsive differentiation (Mobile <768px bottom nav / single column PWA vs Desktop >=768px full screen with sidebar navigation, rich multi-column layout for dashboard/views).
- Requirement R3: WhatsApp "Estoy afuera" 1-touch button on active orders / order cards with client phone cleaning (handling prefixes like +54 9, 0, 15, spaces, hyphens, and fallback to prompt/clipboard if no phone).
