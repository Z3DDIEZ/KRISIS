import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// H2U Intelligence Architecture - Translation Registry
const resources = {
    en: {
        translation: {
            common: {
                execute: 'Execute',
                cancel: 'Cancel',
                save: 'Save Changes',
                delete: 'Delete Protocol',
                loading: 'Orchestrating Data...',
                error: 'System Exception',
            },
            dashboard: {
                title: 'Intelligence Dashboard',
                subtitle: 'Swiss-engineered tracking for the modern software professional.',
                stagnant: 'Stagnant Slots',
                volume: 'Pipeline Volume',
                success: 'Success Quotient',
            },
            auth: {
                login: 'Initiate Session',
                signup: 'Register Node',
                logout: 'Terminate Session',
                welcome: 'Welcome back, operator.',
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
