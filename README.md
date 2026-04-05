<div align="center">

<img src="./assets/petra-logo.png" alt="Petra Logo" width="120" />

# 🪨 Petra Presenter

**A modern, feature-rich presentation software built for worship,
live events, and stage productions.**

[![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)

[Features](#-features) •
[Screenshots](#-screenshots) •
[Getting Started](#-getting-started) •
[Architecture](#-architecture) •
[Contributing](#-contributing)

</div>

---

## 📖 Overview

Petra is a cross-platform presenter application designed for **churches,
worship teams, live events, and stage productions**. It combines a powerful
desktop editor with real-time mobile control — so your operator stays in
their seat while the presenter is fully managed from a phone or tablet.

Inspired by tools like EasyWorship and ProPresenter, Petra is built on
modern web technologies to be fast, extensible, and beautiful.

---

## ✨ Features

### 🖥️ Desktop Editor (Electron + React)
- **Slide Canvas** — drag, resize, rotate, and layer elements freely
- **Text Elements** — full font control, stroke, shadow, and 9-point
  text placement (top-left → bottom-right)
- **Image & Video Elements** — background or inline media support
- **Shape Elements** — rectangles, rounded rects, circles, with gradient fill
- **Animated Backgrounds** — 24+ built-in animated backgrounds (see below)
- **Slide Transitions** — smooth transition effects between slides
- **Layer Controls** — bring forward, send back, reorder elements
- **Alignment Toolbar** — align and distribute elements on canvas
- **Speaker Notes** — per-slide notes panel for presenters
- **Gradient Picker** — solid or gradient fill for backgrounds and shapes
- **Font Picker** — browse and apply system + web fonts

### 📱 Mobile Controller (Flutter)
- **Live Slide Control** — swipe or tap to advance slides remotely
- **Presenter View** — see current + next slide on your phone
- **Speaker Notes** — read notes on the controller while the audience
  sees the slide
- **Real-time Sync** — changes reflect instantly via Socket.io

### 🌐 Web Editor (React)
- **Browser-based editing** — edit presentations from any device
  without installing the desktop app
- **Full feature parity** with the desktop editor

### 🎨 Animated Backgrounds (24+)

| Category   | Backgrounds |
|------------|-------------|
| **Nature** | Aurora, Northern Lights, Waves, Snowfall, Underwater, Sand Storm |
| **Space**  | Starfield, Galaxy, Meteor Shower |
| **Energy** | Fire, Lightning, Plasma, Lava Lamp, Neon Pulse, Vortex |
| **Digital**| Matrix, Cyberpunk Grid, Glitch, DNA Helix, Neon Rain |
| **Ambient**| Bubbles, Bokeh, Confetti, Particles, Geometric |

Every animated background supports:
- 🎨 Custom colors (3 accent colors + background color)
- ⚡ Speed control
- 🔆 Opacity control
- ↺ One-click reset to defaults

---

## 🖼️ Screenshots

> _Coming soon — screenshots and demo GIF will be added here._

---

## 🏗️ Architecture
petra-presenter/
│
├── src/
│ ├── main/ # Electron main process
│ │ ├── main.ts # App entry point
│ │ └── preload.ts # Context bridge
│ │
│ ├── server/ # Shared backend + types
│ │ ├── types.ts # SlideElement, Slide, AnimatedBackground...
│ │ ├── socketServer.ts # Socket.io server
│ │ └── presentationService.ts # Business logic
│ │
│ └── renderer/ # React frontend (desktop + web)
│ ├── components/
│ │ ├── Editor/
│ │ │ ├── Canvas.tsx # Konva slide canvas
│ │ │ ├── EditableText.tsx # Text element
│ │ │ ├── PropertiesPanel.tsx # Right panel
│ │ │ ├── SlideList.tsx # Left slide thumbnails
│ │ │ ├── AlignmentToolbar.tsx # Align/distribute toolbar
│ │ │ ├── AlignmentPicker.tsx # 3x3 text placement grid
│ │ │ ├── AnimatedBackground.tsx # Background renderer + registry
│ │ │ ├── AnimatedBgPicker.tsx # Background picker UI
│ │ │ ├── LayerControls.tsx # Z-order controls
│ │ │ ├── TransitionControl.tsx # Slide transitions
│ │ │ ├── FontPicker.tsx # Font browser
│ │ │ ├── GradientPicker.tsx # Solid/gradient picker
│ │ │ │
│ │ │ ├── AnimatedBackgrounds/ # One folder per background
│ │ │ │ ├── Aurora/
│ │ │ │ ├── Waves/
│ │ │ │ ├── Bokeh/
│ │ │ │ └── ...24 total
│ │ │ │
│ │ │ └── Backgrounds/ # Color controls
│ │ │ ├── ColorRow.tsx # Shared swatch + hex input
│ │ │ ├── AuroraControls.tsx
│ │ │ ├── WavesControls.tsx
│ │ │ ├── BokehControls.tsx
│ │ │ ├── GenericBgControls.tsx # Reusable 3-color panel
│ │ │ └── ...
│ │ │
│ │ └── Presenter/
│ │ └── PresentView.tsx # Full-screen output window
│ │
│ ├── store/
│ │ └── usePresentation.ts # Zustand global store
│ │
│ └── utils/
│ ├── alignmentUtils.ts # Text placement helpers
│ └── fileManager.ts # File reading / blob URLs
│
└── mobile/ # Flutter mobile controller
├── lib/
│ ├── main.dart
│ ├── screens/
│ │ ├── controller_screen.dart # Slide remote control
│ │ └── notes_screen.dart # Speaker notes view
│ └── services/
│ └── socket_service.dart # Socket.io client
└── pubspec.yaml



---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 18.x |
| npm / yarn | latest |
| Flutter SDK | >= 3.x |
| Git | any |

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/petra-presenter.git
cd petra-presenter

2. Install Desktop App Dependencies
bash
npm install
3. Run in Development Mode
bash
# Starts Electron + React dev server together
npm run dev
4. Build for Production
bash
# Desktop (Electron)
npm run build

# Package as installer (Windows / macOS / Linux)
npm run package
5. Run the Mobile Controller
bash
cd mobile
flutter pub get
flutter run
Make sure your phone and desktop are on the same Wi-Fi network.
The app will auto-discover the desktop server via Socket.io.

6. Web Editor (Optional)
bash
# Runs the React editor in the browser without Electron
npm run web
⚙️ Configuration
env
# .env
VITE_SOCKET_PORT=3001       # Socket.io server port
VITE_APP_NAME=Petra         # App display name
🔌 Socket Events
Event	Direction	Payload	Description
slide:next	Mobile → Desktop	{}	Advance to next slide
slide:prev	Mobile → Desktop	{}	Go to previous slide
slide:goto	Mobile → Desktop	{ index: number }	Jump to slide
slide:current	Desktop → Mobile	{ slide, index }	Current slide state
presentation:sync	Desktop → All	{ presentation }	Full sync
notes:update	Desktop → Mobile	{ notes: string }	Speaker notes
🎨 Adding a New Animated Background
Create component in src/renderer/components/Editor/AnimatedBackgrounds/YourBg/YourBg.tsx
typescript
function YourBg({ config }: { config: AnimatedBackground }) {
  const c1 = config.color1 ?? '#default';
  // ...
  return <div style={{ position: 'absolute', inset: 0 }}> ... </div>;
}
export default YourBg;
Add keyframes inside injectKeyframes() in AnimatedBackground.tsx

Register in the RENDERERS map and ANIMATED_BG_OPTIONS array

Add type to AnimatedBgType in src/server/types.ts

Create controls using GenericBgControls or a custom component

Wire controls in AnimatedBgPicker.tsx

🧩 Tech Stack
Layer	Technology
Desktop Shell	Electron
UI Framework	React 18 + TypeScript
Canvas Rendering	React-Konva
State Management	Zustand
Styling	Tailwind CSS + inline styles
Real-time Comms	Socket.io
Mobile App	Flutter 3
Bundler	Vite
Package	electron-builder
🗺️ Roadmap
 📦 Song library with CCLI integration
 📺 Multi-screen output (Stage Display + Audience)
 🎵 Audio cue support
 🖨️ Print / export to PDF
 ☁️ Cloud sync for presentations
 🌍 Web presenter view for audience devices
 🔌 OBS / NDI output integration
 📱 iPad split-view controller
 🎤 Teleprompter mode
🤝 Contributing
Contributions are welcome! Please follow these steps:

bash
# 1. Fork the repo
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Commit your changes
git commit -m 'feat: add amazing feature'

# 4. Push to the branch
git push origin feature/amazing-feature

# 5. Open a Pull Request
Commit Convention
We follow Conventional Commits:

Prefix	Use for
feat:	New feature
fix:	Bug fix
refactor:	Code restructure
style:	UI / styling only
docs:	Documentation
chore:	Build / config
📄 License
text
MIT License — © 2024 Petra Presenter Contributors
🙏 Acknowledgements
Inspired by EasyWorship and
ProPresenter
Canvas rendering powered by Konva.js
Icons from Lucide
Made with ❤️ for worship teams everywhere

⬆ Back to top