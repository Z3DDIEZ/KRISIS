# KRISIS - AI Job Application Intelligence

**KRISIS** is an AI-augmented SaaS platform that tracks job applications and provides intelligent insights using Google's Gemini AI to help job seekers optimize their application strategy.

## 📊 Project Status

**Current Phase: Month 3 - Analytics & Data Pipeline**

The project is currently in active development, focusing on advanced analytics, data visualization, and UI/UX refinement.

### ✅ Completed Modules
- **Core Infrastructure**: React 18 + TypeScript + Vite setup, Firebase integration (Auth, Firestore, Hosting).
- **Authentication**: Robust implementation with Email/Password and Google OAuth, including profile management.
- **Job Tracking**: Full CRUD capabilities for job applications, status tracking (Applied, Interview, Offer, etc.).
- **Dashboarding**: Key metrics visualization and application overview.
- **Analytics**: Initial implementation of charts and data insights.
- **Settings & Profile**: User preference management and profile editing.
- **Design System**: Implementation of a comprehensive design system with CSS variables and Tailwind configuration for consistent theming.

### 🚧 In Progress
- **Advanced AI Integration**: Deepening the Gemini AI features for resume-job fit analysis.
- **Aesthetic Refactor**: Ongoing UI/UX improvements to meet "Premium" design standards (Glassmorphism, Dark Mode).
- **Data Export**: Enhancing CSV/JSON export capabilities.

## 🚀 Features

- **Smart Dashboard**: At-a-glance view of your job search progress and key statistics.
- **Application Tracking**: Detailed tracking of every application with status updates, notes, and company info.
- **Analytics Suite**: Visual insights into your application funnel, success rates, and activity over time.
- **Profile Management**: Manage your professional profile and settings.
- **Secure Authentication**: Enterprise-grade security using Firebase Auth.
- **Responsive Design**: Mobile-first architecture ensuring access from any device.
- **Data Privacy**: Granular security rules ensuring user data isolation.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + CSS Variables (Custom Design System)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Routing**: React Router DOM (v6)
- **Visualization**: Recharts

### Backend & Infrastructure
- **Platform**: Google Cloud Platform
- **BaaS**: Firebase (Auth, Firestore, Hosting, Functions)
- **AI**: Google Gemini Pro API
- **Analytics**: BigQuery

## 📁 Project Structure

```
krisis/
├── docs/                    # Detailed documentation & roadmaps
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Application views (Dashboard, Analytics, etc.)
│   │   ├── styles/          # Design system & global styles
│   │   ├── lib/             # Utilities & Firebase config
│   │   └── hooks/           # Custom React hooks
├── functions/               # Cloud Functions for backend logic
├── infra/                   # Infrastructure configuration (BigQuery, Rules)
└── scripts/                 # Utility scripts
```

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