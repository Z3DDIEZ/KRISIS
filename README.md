# KRISIS - AI Job Application Intelligence

**KRISIS** is an AI-augmented SaaS platform that tracks job applications and provides intelligent insights using Google's Gemini AI to help job seekers optimize their application strategy.

## 🚀 Features

- **Real-time Application Tracking**: Track job applications with status updates
- **AI-Powered Analysis**: Get resume-job fit scores and improvement suggestions
- **Smart Analytics**: Visualize application funnel and success patterns
- **Automated Workflows**: Follow-up reminders and progress tracking
- **Data Export**: Export your data in multiple formats
- **Multi-platform**: Web application with mobile-responsive design

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- TanStack Query (data fetching)
- Zustand (state management)
- Firebase SDK

### Backend
- Firebase (Auth, Firestore, Hosting)
- Cloud Functions (2nd Gen)
- BigQuery (analytics)
- Gemini AI API

### Infrastructure
- Google Cloud Platform
- Firebase Hosting
- Secret Manager
- Cloud Monitoring

## 🏁 Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (optional)

### 1. Clone and Install
```bash
git clone <repository-url>
cd krisis

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install functions dependencies (when ready)
cd functions && npm install && cd ..
```

### 2. Firebase Setup
```bash
# Login to Firebase
firebase login

# Initialize Firebase project (or use existing)
firebase use --add
# Select your project

# Set up environment variables
cd frontend
cp env.example .env
# Edit .env with your Firebase config
```

### 3. Development
```bash
# Start frontend development server
cd frontend
npm run dev

# In another terminal, start functions (when ready)
cd functions
npm run serve
```

### 4. Build for Production
```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase
firebase deploy
```

## 📁 Project Structure

```
krisis/
├── docs/                    # Documentation (private)
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── layouts/         # Page layouts
│   │   ├── lib/            # Utilities & Firebase config
│   │   ├── pages/          # Page components
│   │   └── test/           # Test utilities
│   ├── public/             # Static assets
│   └── *.config.*          # Build configurations
├── functions/               # Cloud Functions
├── infra/                   # Infrastructure configs
│   ├── bigquery/           # BigQuery schemas
│   ├── firestore.rules     # Database security rules
│   └── storage.rules       # Storage security rules
├── firebase.json           # Firebase configuration
├── .firebaserc            # Firebase project aliases
└── package.json           # Root dependencies
```

## 🔧 Development Scripts

### Frontend
```bash
cd frontend

npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:ui      # Run tests with UI
```

### Firebase
```bash
firebase deploy              # Deploy all services
firebase deploy --only hosting  # Deploy only hosting
firebase serve               # Start local emulators
```

## 🔐 Security & Privacy

- **Data Isolation**: Each user can only access their own data
- **AI Privacy**: Analysis requests are processed server-side only
- **GDPR Compliance**: Data export and deletion capabilities
- **Secure Authentication**: Firebase Auth with email/password and Google OAuth

## 📊 Analytics & Monitoring

- **Cloud Logging**: Comprehensive logging for debugging
- **Cloud Monitoring**: Performance metrics and alerting
- **BigQuery**: Advanced analytics and reporting
- **Error Reporting**: Automatic error tracking

## 🚀 Deployment

### Environments
- **Development**: `krisis-dev` Firebase project
- **Staging**: `krisis-staging` Firebase project
- **Production**: `krisis-prod` Firebase project

### CI/CD
- GitHub Actions for automated testing and deployment
- Separate pipelines for dev/staging/production
- Automated testing on pull requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support

For questions or support:
- Create an issue in the repository
- Check the documentation in the `docs/` folder
- Review the development roadmap

## 🎯 Roadmap

- **Phase 1** (Current): Core application tracking and AI analysis
- **Phase 2**: Advanced analytics and automation
- **Phase 3**: Mobile apps and enterprise features
- **Phase 4**: Multi-tenant architecture and scaling

---

**Built with ❤️ using Google Cloud Platform**