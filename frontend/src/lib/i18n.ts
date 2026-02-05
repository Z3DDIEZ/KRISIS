import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// H2U Intelligence Architecture - Translation Registry
const resources = {
    en: {
        translation: {
            common: {
                execute: 'View',
                cancel: 'Cancel',
                save: 'Save Changes',
                delete: 'Delete Application',
                loading: 'Loading Data...',
                error: 'System Error',
            },
            dashboard: {
                title: 'Dashboard',
                subtitle: 'Track your career progress in real-time.',
                stagnant: 'Inactive',
                volume: 'Total Applications',
                success: 'Success Rate',
            },
            auth: {
                login: 'Sign In',
                signup: 'Create Account',
                logout: 'Sign Out',
                welcome: 'Welcome back.',
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        }
    });

export default i18n;
