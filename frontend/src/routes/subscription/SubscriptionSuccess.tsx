import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import { useTranslation } from 'react-i18next';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/v1/subscription`);
      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          setSubscription(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-4">
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('subscription.success.title')}
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            {t('subscription.success.welcome')} {subscription?.tier && (
              <span className="font-semibold capitalize">{t(`pricing.plans.${subscription.tier}.name`)}</span>
            )}!
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">{t('subscription.success.whatNext')}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {t('subscription.success.accountUpgraded')}
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {t('subscription.success.accessFeatures')}
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {t('subscription.success.receiptSent')}
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/projects')}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              {t('subscription.success.goToProjects')}
            </button>
            
            <button
              onClick={() => navigate('/account/subscription')}
              className="w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              {t('subscription.success.viewAccount')}
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            {t('subscription.success.needHelp')} <a href="/contact" className="text-blue-600 hover:text-blue-700 underline">{t('subscription.success.contactSupport')}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;