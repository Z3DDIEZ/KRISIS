# KRISIS - Intelligence Architecture v3.0

**KRISIS** is a high-fidelity AI-augmented SaaS platform engineered for professional job search intelligence. It leverages Swiss design principles and Google's Gemini Pro AI to transform tracking into a tactical decision protocol.

## 📊 Intelligence Status: PHASE 6 - ARCHITECTURE REFACTOR
The platform has evolved from a simple tracker into a unified, modular Intelligence Architecture.

### ✅ Completed Modules
- **H2U Design Language**: Full implementation of Swiss/Bauhaus precision with intentional asymmetry.
- **Decision-Driven UX**: Re-engineered KPI cards and urgent protocol grids for actionable feedback.
- **Modular Core**: Transitioned to "Bulletproof React" feature-based architecture.
- **Intelligence Reports**: High-fidelity PDF generation (`jsPDF`) for regional pipeline logic.
- **Multilingual Support**: Fully wired `react-i18next` for global deployment.

## 🛠️ Tech Stack Evolution

### Frontend Precision
- **Architecture**: Bulletproof React (Feature-Driven Structure)
- **UI Primitives**: Radix UI (Accessible & Unstyled)
- **Styling**: SCSS Modules + Tailwind CSS
- **State Mgmt**: Zustand (Global) + TanStack Query (Server)
- **Forms**: React Hook Form + Zod Schema Validation
- **Engine**: Vite + TypeScript 5.2

### Infrastructure & Intelligence
- **Platform**: Google Cloud (Cloud Functions 2nd Gen, BigQuery)
- **BaaS**: Firebase (Auth, Firestore, Hosting)
- **AI**: Gemini Pro (Resume Analysis & Behavioral Intelligence)

## 📁 Project Structure (Architecture v3)

```
krisis/
├── docs/                    # Architectural Blueprints & Roadmaps
├── frontend/                # Intelligence Dashboard 
│   ├── src/
│   │   ├── components/      # AsymmetricGrid, StatCards, Shared UI
│   │   ├── providers/       # i18n, Auth, Context Layers
│   │   ├── stores/          # Zustand Global State (Notifications, UI)
│   │   ├── lib/             # Zod Schemas, i18n Config, Firebase
│   │   ├── styles/          # Bauhaus SCSS Core & Variables
│   │   └── pages/           # Pipeline Views
```

## 🛠️ Tactical Implementation Details

- **Neural Schema Validation**: All application data entry is governed by `Zod` schemas, providing strict runtime type safety and high-fidelity error reporting.
- **Global Signal Processor**: A centralized `Zustand` store manages system-wide notifications and UI states with auto-dismiss logic and tactical slide-in animations.
- **Linguistic Precision**: `react-i18next` provides a robust translation registry, ready for multi-region deployment.
- **SCSS Bauhaus Bridge**: A sophisticated SCSS architecture with 8-point vertical rhythm mixins and breakpoints, bridging the gap between Tailwind's utility-first approach and custom grid requirements.

## 🏁 Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Auth and Firestore enabled

### 1. Clone and Install
```bash
git clone <repository-url>
cd krisis

# Install frontend dependencies
cd frontend && npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cd frontend
cp env.example .env

# Edit .env with your Firebase project credentials
```

### 3. Development
```bash
# Start development server
cd frontend
npm run dev
```

### 4. Build & Test
```bash
cd frontend
npm run test    # Run tests
npm run build   # Build for production
```

## 🚀 Deployment

The project is configured for deployment via Firebase Hosting and GitHub Actions.

```bash
# Manual deployment
firebase deploy --only hosting
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support

For questions or support:
- Check the documentation in the `docs/` folder
- Review the `docs/development-roadmap.md` for future plans