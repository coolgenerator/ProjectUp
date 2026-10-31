import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../store/store';

/**
 * Language synchronization component that:
 * 1. Syncs language from Redux store
 * 2. Syncs language from localStorage on mount
 * 3. Syncs language across browser tabs/windows
 * 4. Can optionally wrap children components
 */
interface LanguageSyncProps {
    children?: React.ReactNode;
}

const LanguageSync: React.FC<LanguageSyncProps> = ({ children }) => {
    const { i18n } = useTranslation();
    const reduxLanguage = useSelector((state: RootState) => state.settings?.language);

    // Sync Redux language with i18n
    useEffect(() => {
        if (reduxLanguage && i18n.language !== reduxLanguage) {
            i18n.changeLanguage(reduxLanguage);
        }
    }, [reduxLanguage, i18n]);

    // Sync from localStorage on initial mount and listen for cross-tab changes
    useEffect(() => {
        // Initialize language from localStorage on mount
        const storedLanguage = localStorage.getItem('language');
        if (storedLanguage && storedLanguage !== i18n.language) {
            i18n.changeLanguage(storedLanguage);
        }

        // Listen for storage changes (for multi-tab/window sync)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'language' && e.newValue) {
                i18n.changeLanguage(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [i18n]);

    // If children are provided, render them (provider mode)
    // Otherwise, return null (component mode)
    return children ? <>{children}</> : null;
};

export default LanguageSync;