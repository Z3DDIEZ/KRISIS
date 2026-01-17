# KRISIS Frontend

The React frontend for KRISIS - AI-Augmented Job Application Intelligence Platform.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for routing
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Firebase** for authentication and database
- **Recharts** for analytics visualization
- **Sonner** for toast notifications

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
```

Fill in your Firebase configuration in the `.env` file.

3. Start development server:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ui/             # Basic UI components (buttons, inputs, etc.)
├── layouts/            # Page layout components
├── lib/                # Utilities and configurations
│   └── firebase.ts     # Firebase configuration
├── pages/              # Page components
├── test/               # Test utilities
├── App.tsx             # Main app component
├── AppRoutes.tsx       # Route definitions
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use functional components with hooks
- Implement proper error boundaries

### State Management
- Use TanStack Query for server state
- Use Zustand for client state
- Avoid prop drilling with context when possible

### Testing
- Write unit tests for utilities and hooks
- Write integration tests for components
- Aim for 70%+ test coverage

## Firebase Configuration

The app uses Firebase for:
- Authentication (Email/Password + Google OAuth)
- Firestore database for application data
- Cloud Functions for AI processing
- Hosting for production deployment

## Deployment

The app is configured for deployment to Firebase Hosting with automatic builds via CI/CD.

## Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure accessibility compliance
5. Test on multiple devices/browsers