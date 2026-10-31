import React from "react";
import { useTranslation } from "react-i18next";

const Loading: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-slate-800 dark:to-slate-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 dark:border-purple-400"></div>
            <p className="mt-4 text-gray-600 dark:text-slate-300">{t('common.loading')}</p>
        </div>
    );
};

export default Loading; 