#!/bin/bash

# Deploy Firestore rules locally for testing
# Usage: ./scripts/deploy-rules.sh [project-id]
# If no project-id provided, uses krisis-prod

set -e

PROJECT_ID=${1:-"krisis"}

echo "🚀 Deploying Firestore rules to project: $PROJECT_ID"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Run: firebase login"
    exit 1
fi

# Deploy directly to the project (no need to use aliases)
echo "🔥 Deploying Firestore rules..."
firebase deploy --only firestore:rules --project "$PROJECT_ID"

echo "✅ Firestore rules deployed successfully!"
echo ""
echo "🔍 To test locally:"
echo "   firebase emulators:start --only firestore"
echo ""
echo "📝 Rules file: infra/firestore.rules"
echo "🎯 Project: $PROJECT_ID"