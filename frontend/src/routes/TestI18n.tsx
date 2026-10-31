import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const TestI18n: React.FC = () => {
    const { t, i18n } = useTranslation();
    const reduxLanguage = useSelector((state: RootState) => state.settings.language);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">I18n Debug Test</h1>
            
            <div className="space-y-2 mb-4">
                <p><strong>Current i18n language:</strong> {i18n.language}</p>
                <p><strong>Redux language:</strong> {reduxLanguage}</p>
                <p><strong>LocalStorage language:</strong> {localStorage.getItem('language')}</p>
            </div>

            <div className="space-y-2 mb-4">
                <button 
                    onClick={() => i18n.changeLanguage('en')}
                    className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
                >
                    Switch to English
                </button>
                <button 
                    onClick={() => i18n.changeLanguage('zh')}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                >
                    Switch to Chinese
                </button>
            </div>

            <div className="border p-4 rounded">
                <h2 className="text-xl font-semibold mb-2">Account Settings Test:</h2>
                <p>settings.account.title: {t('settings.account.title')}</p>
                <p>settings.account.updateUsername: {t('settings.account.updateUsername')}</p>
                <p>settings.account.username: {t('settings.account.username')}</p>
                <p>settings.account.usernameHint: {t('settings.account.usernameHint')}</p>
                <p>settings.account.updateUsernameButton: {t('settings.account.updateUsernameButton')}</p>
                <p>settings.account.updateEmail: {t('settings.account.updateEmail')}</p>
                <p>settings.account.currentEmail: {t('settings.account.currentEmail')}</p>
                <p>settings.account.newEmail: {t('settings.account.newEmail')}</p>
                <p>settings.account.emailVerificationNote: {t('settings.account.emailVerificationNote')}</p>
                <p>settings.account.updateEmailButton: {t('settings.account.updateEmailButton')}</p>
            </div>
        </div>
    );
};

export default TestI18n;