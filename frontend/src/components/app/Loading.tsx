import React from "react";
import { useTranslation } from "react-i18next";

const LoadingPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="flex flex-col items-center">
                {/* Animation */}
                <div className="flex space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-bounce delay-200"></div>
                    <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce delay-400"></div>
                </div>
                {/* Loading Text */}
                <p className="mt-4 text-lg font-semibold text-gray-700">{t('common.loadingPleaseWait')}</p>
            </div>
        </div>
    );
};

export default LoadingPage;
