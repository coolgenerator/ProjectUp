import React, { useState, useEffect } from 'react';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Subscription {
  id: number;
  tier: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface PaymentMethod {
  id: number;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface PaymentHistory {
  id: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  invoice_url: string;
  created_at: string;
}

const SubscriptionManagement: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'history'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSubscription(),
        fetchPaymentMethods(),
        fetchPaymentHistory(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/v1/subscription`, {
        cache: 'no-store', // Force fresh fetch, bypass browser cache
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          setSubscription(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/v1/payment-methods`);
      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          setPaymentMethods(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/v1/payments/history`);
      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          setPaymentHistory(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || subscription.tier === 'free') return;

    if (confirm(t('subscription.confirmCancel'))) {
      try {
        const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/v1/subscription/cancel`, {
          method: 'POST',
        });

        if (response.ok) {
          alert(t('subscription.currentPlan.cancelNotice'));
          fetchSubscription();
        }
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        alert('Failed to cancel subscription. Please try again.');
      }
    }
  };

  const handleReactivateSubscription = async () => {
    // This would typically call an endpoint to reactivate the subscription
    navigate('/pricing');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">{t('subscription.title')}</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('subscription.tabs.overview')}
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payment'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('subscription.tabs.payment')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('subscription.tabs.history')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subscription.currentPlan.title')}</h3>
            {subscription ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('subscription.currentPlan.plan')}:</span>
                  <span className="font-semibold capitalize">
                    {t(`pricing.plans.${subscription.tier}.name`)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('subscription.currentPlan.status')}:</span>
                  <span className={`font-semibold capitalize ${
                    subscription.status === 'active' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                {subscription.tier !== 'free' && subscription.current_period_end && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className="text-gray-900">
                        {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                    {subscription.cancel_at_period_end && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          {t('subscription.currentPlan.cancelNotice')} {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-600">{t('subscription.currentPlan.noSubscription')}</p>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex space-x-3">
              {subscription?.tier === 'free' ? (
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('subscription.currentPlan.upgradePlan')}
                </button>
              ) : subscription?.cancel_at_period_end ? (
                <button
                  onClick={handleReactivateSubscription}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('subscription.currentPlan.reactivate')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('subscription.currentPlan.changePlan')}
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {t('subscription.currentPlan.cancelSubscription')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('subscription.paymentMethods.title')}</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                {t('subscription.paymentMethods.addMethod')}
              </button>
            </div>
            
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-12 bg-gray-100 rounded flex items-center justify-center text-xs font-semibold">
                        {method.brand}
                      </div>
                      <div>
                        <p className="font-medium">•••• {method.last4}</p>
                        <p className="text-sm text-gray-600">
                          {t('subscription.paymentMethods.expires')} {method.exp_month}/{method.exp_year}
                        </p>
                      </div>
                    </div>
                    {method.is_default && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        {t('subscription.paymentMethods.default')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">{t('subscription.paymentMethods.noMethods')}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('subscription.billingHistory.title')}</h3>
            </div>
            
            {paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('subscription.billingHistory.date')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('subscription.billingHistory.description')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('subscription.billingHistory.amount')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('subscription.billingHistory.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('subscription.billingHistory.invoice')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.description || t('subscription.billingHistory.subscriptionPayment')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatAmount(payment.amount, payment.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.status === 'succeeded' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.invoice_url && (
                            <a
                              href={payment.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {t('subscription.billingHistory.download')}
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-600">
                {t('subscription.billingHistory.noHistory')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;