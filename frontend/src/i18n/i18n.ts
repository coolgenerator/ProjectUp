import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enHome from './locales/en/home.json';
import enProjects from './locales/en/projects.json';
import enResources from './locales/en/resources.json';
import enBuild from './locales/en/build.json';
import enMessages from './locales/en/messages.json';
import enProfile from './locales/en/profile.json';
import enSettings from './locales/en/settings.json';
import enErrors from './locales/en/errors.json';
import enFooter from './locales/en/footer.json';
import enPaperReader from './locales/en/paperReader.json';
import enPricing from './locales/en/pricing.json';
import enSubscription from './locales/en/subscription.json';
import enPosts from './locales/en/posts.json';
import enConnections from './locales/en/connections.json';
import enNotifications from './locales/en/notifications.json';
import enAiAssistant from './locales/en/aiAssistant.json';
import enResearch from './locales/en/research.json';
import enSaved from './locales/en/saved.json';
import enLanding from './locales/en/landing.json';
import enMatch from './locales/en/match.json';

// Chinese translations
import zhCommon from './locales/zh/common.json';
import zhAuth from './locales/zh/auth.json';
import zhHome from './locales/zh/home.json';
import zhProjects from './locales/zh/projects.json';
import zhResources from './locales/zh/resources.json';
import zhBuild from './locales/zh/build.json';
import zhMessages from './locales/zh/messages.json';
import zhProfile from './locales/zh/profile.json';
import zhSettings from './locales/zh/settings.json';
import zhErrors from './locales/zh/errors.json';
import zhFooter from './locales/zh/footer.json';
import zhPaperReader from './locales/zh/paperReader.json';
import zhPricing from './locales/zh/pricing.json';
import zhSubscription from './locales/zh/subscription.json';
import zhPosts from './locales/zh/posts.json';
import zhConnections from './locales/zh/connections.json';
import zhNotifications from './locales/zh/notifications.json';
import zhAiAssistant from './locales/zh/aiAssistant.json';
import zhResearch from './locales/zh/research.json';
import zhSaved from './locales/zh/saved.json';
import zhLanding from './locales/zh/landing.json';
import zhMatch from './locales/zh/match.json';

// Spanish translations
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esHome from './locales/es/home.json';
import esProjects from './locales/es/projects.json';
import esResources from './locales/es/resources.json';
import esBuild from './locales/es/build.json';
import esMessages from './locales/es/messages.json';
import esProfile from './locales/es/profile.json';
import esSettings from './locales/es/settings.json';
import esErrors from './locales/es/errors.json';
import esFooter from './locales/es/footer.json';
import esPaperReader from './locales/es/paperReader.json';
import esPricing from './locales/es/pricing.json';
import esSubscription from './locales/es/subscription.json';
import esPosts from './locales/es/posts.json';
import esConnections from './locales/es/connections.json';
import esNotifications from './locales/es/notifications.json';
import esAiAssistant from './locales/es/aiAssistant.json';
import esResearch from './locales/es/research.json';
import esSaved from './locales/es/saved.json';

// Merge all translations - nest under namespaces
const resources = {
  en: {
    translation: {
      ...enCommon,      // Spreads common keys like nav at root level
      common: enCommon, // Also add under "common" namespace for common.cancel, common.loading, etc.
      auth: enAuth,
      home: enHome,
      welcome: enHome,  // Alias for backward compatibility
      projects: enProjects,
      resources: enResources,
      build: enBuild,
      messages: enMessages,
      profile: enProfile,
      settings: enSettings,
      errors: enErrors,
      footer: enFooter,
      paperReader: enPaperReader,
      pricing: enPricing,
      subscription: enSubscription,
      posts: enPosts,
      connections: enConnections,
      notifications: enNotifications,
      aiAssistant: enAiAssistant,
      research: enResearch,
      saved: enSaved,
      landing: enLanding,
      match: enMatch
    }
  },
  zh: {
    translation: {
      ...zhCommon,      // Spreads common keys like nav at root level
      common: zhCommon, // Also add under "common" namespace for common.cancel, common.loading, etc.
      auth: zhAuth,
      home: zhHome,
      welcome: zhHome,  // Alias for backward compatibility
      projects: zhProjects,
      resources: zhResources,
      build: zhBuild,
      messages: zhMessages,
      profile: zhProfile,
      settings: zhSettings,
      errors: zhErrors,
      footer: zhFooter,
      paperReader: zhPaperReader,
      pricing: zhPricing,
      subscription: zhSubscription,
      posts: zhPosts,
      connections: zhConnections,
      notifications: zhNotifications,
      aiAssistant: zhAiAssistant,
      research: zhResearch,
      saved: zhSaved,
      landing: zhLanding,
      match: zhMatch
    }
  },
  es: {
    translation: {
      ...esCommon,      // Spreads common keys like nav at root level
      common: esCommon, // Also add under "common" namespace for common.cancel, common.loading, etc.
      auth: esAuth,
      home: esHome,
      welcome: esHome,  // Alias for backward compatibility
      projects: esProjects,
      resources: esResources,
      build: esBuild,
      messages: esMessages,
      profile: esProfile,
      settings: esSettings,
      errors: esErrors,
      footer: esFooter,
      paperReader: esPaperReader,
      pricing: esPricing,
      subscription: esSubscription,
      posts: esPosts,
      connections: esConnections,
      notifications: esNotifications,
      aiAssistant: esAiAssistant,
      research: esResearch,
      saved: esSaved
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en',
    debug: false,

    interpolation: {
      escapeValue: false
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;