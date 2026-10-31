import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import { useTranslation } from 'react-i18next';
import config from "../../config.ts"

const { API_BASE_URL } = config;

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PricingPlan {
  id: string;
  tier: string;
  name: string;
  price: number;
  annualPrice: number;
  currency: string;
  period: string;
  priceUnit?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  buttonText: string;
}

interface UserSubscription {
  id: number;
  tier: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const PricingPlans: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [couponCode, setCouponCode] = useState<string>('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    whatAre: false,
    monthlyVsBonus: false,
    howMany: false,
  });
  const [hasEduEmail, setHasEduEmail] = useState(false);
  const [eduEmail, setEduEmail] = useState<string>('');

  const isAuthenticated = useSelector((state: RootState) => state.auth.authenticated);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserSubscription();
      fetchEduVerification();

      // Check if there's a pending plan selection after login
      const storedPlan = sessionStorage.getItem('selectedPlan');
      if (storedPlan) {
        const { planTier, isAnnual } = JSON.parse(storedPlan);
        sessionStorage.removeItem('selectedPlan');

        // Automatically proceed to checkout
        handleCheckoutWithPlan(planTier, isAnnual);
      }
    } else {
      // Reset student mode if user is not authenticated
      setHasEduEmail(false);
      setEduEmail('');
      setIsStudent(false);
    }
  }, [isAuthenticated]);

  // Reset student mode if user doesn't have .edu email
  useEffect(() => {
    if (isStudent && !hasEduEmail) {
      setIsStudent(false);
    }
  }, [hasEduEmail]);

  const fetchUserSubscription = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/subscription`);
      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          setUserSubscription(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user subscription:', error);
    }
  };

  const fetchEduVerification = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/user/edu-verification`);
      if (response.ok) {
        const data = await response.json();
        setHasEduEmail(data.has_edu_email || false);
        setEduEmail(data.edu_email || '');
      }
    } catch (error) {
      console.error('Failed to fetch .edu verification:', error);
      setHasEduEmail(false);
    }
  };

  const individualPlans: PricingPlan[] = [
    {
      id: 'free',
      tier: 'free',
      name: t('pricing.plans.free.name', 'Basic'),
      price: 0,
      annualPrice: 0,
      currency: 'USD',
      period: 'mo',
      description: t('pricing.plans.free.description', 'Perfect for getting started'),
      features: t('pricing.plans.free.features', {
        returnObjects: true, defaultValue: [
          'Browse and apply to recruiting projects',
          'Create paper notes',
          '0 UP Credits',
          '30MB storage',
          'Community support',
        ]
      }) as string[],
      buttonText: t('pricing.plans.free.buttonText', 'Get Started'),
    },
    {
      id: 'starter',
      tier: 'starter',
      name: t('pricing.plans.starter.name', 'Starter'),
      price: 4.99,
      annualPrice: 3.99, // $47.88/year = $3.99/mo (20% off)
      currency: 'USD',
      period: 'mo',
      description: t('pricing.plans.starter.description', 'For turning your first idea into a project'),
      features: t('pricing.plans.starter.features', {
        returnObjects: true, defaultValue: [
          'AI idea coach that asks, never decides',
          '10 UP Credits/mo',
          '100MB storage',
          '1 project/mo',
          'IdeaTree access',
          'Project collaboration',
          'Paper AI assistant',
          'Community support',
        ]
      }) as string[],
      buttonText: t('pricing.plans.starter.buttonText', 'Start with Starter'),
    },
    {
      id: 'advanced',
      tier: 'advanced',
      name: t('pricing.plans.advanced.name', 'Advanced'),
      price: 19.99,
      annualPrice: 15.99, // $191.88/year = $15.99/mo (20% off)
      currency: 'USD',
      period: 'mo',
      description: t('pricing.plans.advanced.description', 'For students and researchers building a team'),
      features: t('pricing.plans.advanced.features', {
        returnObjects: true, defaultValue: [
          'AI teammate suggestions for your open roles',
          '50 UP Credits/mo',
          '500MB storage',
          '5 projects/mo',
          'Everything in Starter',
          'Advanced workflows & tools',
          'Team meeting schedules',
          'Priority support',
          'Version control',
        ]
      }) as string[],
      buttonText: t('pricing.plans.advanced.buttonText', 'Go Advanced'),
    },
    {
      id: 'pro',
      tier: 'pro',
      name: t('pricing.plans.pro.name', 'Pro'),
      price: 39.99,
      annualPrice: 31.99, // $383.88/year = $31.99/mo (20% off)
      currency: 'USD',
      period: 'mo',
      description: t('pricing.plans.pro.description', 'For power users and professionals'),
      features: t('pricing.plans.pro.features', {
        returnObjects: true, defaultValue: [
          'Teammate suggestions across all your projects',
          '80 UP Credits/mo',
          '1GB storage',
          'Unlimited projects',
          'Everything in Advanced',
          'Custom integrations',
          'Advanced analytics',
          'API access',
          'Priority support',
        ]
      }) as string[],
      highlighted: true,
      buttonText: t('pricing.plans.pro.buttonText', 'Go Pro'),
    },
  ];

  const teamPlans: PricingPlan[] = [
    {
      id: 'team-shared',
      tier: 'team-shared',
      name: t('pricing.plans.teamShared.name', 'Team Shared'),
      price: 29.99,
      annualPrice: 23.99, // 20% off: $287.88/year = $23.99/mo
      currency: 'USD',
      period: 'mo',
      priceUnit: t('pricing.priceUnits.perUser', 'per user'),
      description: t('pricing.plans.teamShared.description', 'For small to medium teams (3-10 users)'),
      features: t('pricing.plans.teamShared.features', {
        returnObjects: true, defaultValue: [
          'Minimum 3 users',
          '80 UP Credits per user/mo',
          'Everything in Pro (per user)',
          'Shared community server',
          'Team admin dashboard',
          'Shared team resources',
          'Team collaboration spaces',
          'Admin controls & permissions',
          'Team analytics & insights',
          'Expert marketplace access (10% fee)',
        ]
      }) as string[],
      buttonText: t('pricing.plans.teamShared.buttonText', 'Start with Team Shared'),
    },
    {
      id: 'team-isolated',
      tier: 'team-isolated',
      name: t('pricing.plans.teamIsolated.name', 'Team Isolated'),
      price: 49.99,
      annualPrice: 39.99, // 20% off: $479.88/year = $39.99/mo
      currency: 'USD',
      period: 'mo',
      priceUnit: t('pricing.priceUnits.perUserPlusSetup', 'per user + $499 setup'),
      description: t('pricing.plans.teamIsolated.description', 'For labs and organizations needing dedicated infrastructure'),
      features: t('pricing.plans.teamIsolated.features', {
        returnObjects: true, defaultValue: [
          'Minimum 5 users',
          '120 UP Credits per user/mo',
          'Everything in Team Shared',
          'Isolated dedicated server',
          'Custom domain (yourlab.projectup.me)',
          'Private community instance',
          'Customized agents for your organization',
          'White-label options',
          'Advanced security & SSO',
          'Dedicated account manager',
          'Custom training & onboarding',
          'One-time setup: $499',
        ]
      }) as string[],
      buttonText: t('pricing.plans.teamIsolated.buttonText', 'Start with Team Isolated'),
    },
    {
      id: 'enterprise',
      tier: 'enterprise',
      name: t('pricing.plans.enterprise.name', 'Enterprise'),
      price: 0,
      annualPrice: 0,
      currency: 'USD',
      period: 'mo',
      priceUnit: t('pricing.priceUnits.custom', 'custom pricing'),
      description: t('pricing.plans.enterprise.description', 'For large organizations (10+ users)'),
      features: t('pricing.plans.enterprise.features', {
        returnObjects: true, defaultValue: [
          'Everything in Team Isolated',
          'Unlimited team members',
          'Unlimited file storage',
          'Custom contracts & SLAs',
          '24/7 phone & email support',
          'Advanced security & compliance',
          'Custom feature development',
          'Dedicated infrastructure',
          'Volume discount on UP Credits',
        ]
      }) as string[],
      buttonText: t('pricing.plans.enterprise.buttonText', 'Contact Sales'),
    },
  ];

  const getButtonText = (plan: PricingPlan): string => {
    if (!isAuthenticated) {
      if (plan.tier === 'free') {
        return t('pricing.signUpFree', 'Sign Up Free');
      }
      return t('pricing.getStarted', 'Get Started');
    }

    if (userSubscription) {
      if (userSubscription.tier === plan.tier) {
        return userSubscription.cancel_at_period_end
          ? t('subscription.currentPlan.reactivate', 'Reactivate Subscription')
          : t('pricing.currentPlan', 'Current Plan');
      }
    }

    return plan.buttonText;
  };

  const handleCheckoutWithPlan = async (planTier: string, isAnnual: boolean) => {
    setLoading(true);

    try {
      const requestBody: any = {
        plan_tier: planTier,
        is_annual: isAnnual,
        success_url: `${window.location.origin}/subscription/success`,
        cancel_url: `${window.location.origin}/pricing`,
      };
      
      // Include coupon code if provided
      if (couponCode.trim()) {
        requestBody.coupon_code = couponCode.trim();
      }
      
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/v1/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.status && data.data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.data.checkout_url;
      } else {
        console.error('Failed to create checkout session:', data.error || 'Unknown error');
        alert(t('errors.checkoutFailed', 'Failed to start checkout. Please try again.'));
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(t('errors.checkoutFailed', 'Failed to start checkout. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    // Handle enterprise plan
    if (plan.tier === 'enterprise') {
      navigate('/contact-sales');
      return;
    }

    // Handle free plan
    if (plan.tier === 'free') {
      // For free plan, just navigate to registration or dashboard
      if (!isAuthenticated) {
        navigate('/register');
      } else {
        // User is already on free plan or can downgrade to free
        navigate('/projects');
      }
      return;
    }

    // For paid plans, require authentication first
    if (!isAuthenticated) {
      // Store the selected plan in sessionStorage to redirect back after login
      sessionStorage.setItem('selectedPlan', JSON.stringify({
        planTier: plan.tier,
        isAnnual: isAnnual
      }));
      // Redirect to register with a return URL
      navigate('/register?redirect=/pricing&plan=' + plan.id);
      return;
    }

    // If user already has this plan and it's not cancelled
    if (userSubscription && userSubscription.tier === plan.tier && !userSubscription.cancel_at_period_end) {
      return;
    }

    // Use Stripe checkout for paid plans
    setProcessingPlan(plan.id);
    await handleCheckoutWithPlan(plan.tier, isAnnual);
    setProcessingPlan(null);
  };

  const getStudentPrice = (planId: string, isAnnual: boolean) => {
    // Student monthly prices
    const studentMonthly: {[key: string]: number} = {
      'starter': 3.99,
      'advanced': 14.99,
      'pro': 29.99,
    };

    // Student annual prices (monthly equivalent)
    const studentAnnual: {[key: string]: number} = {
      'starter': 3.39,  // $40.68/year
      'advanced': 12.74, // $152.88/year
      'pro': 25.49,      // $305.88/year
    };

    if (isAnnual) {
      return studentAnnual[planId] || 0;
    }
    return studentMonthly[planId] || 0;
  };

  const formatPrice = (plan: PricingPlan) => {
    if (isStudent && (plan.id === 'starter' || plan.id === 'advanced' || plan.id === 'pro')) {
      return getStudentPrice(plan.id, isAnnual).toFixed(2);
    }
    const price = isAnnual ? plan.annualPrice : plan.price;
    return price.toFixed(2);
  };

  const calculateSavings = (plan: PricingPlan) => {
    const monthlyTotal = plan.price * 12;
    const annualTotal = plan.annualPrice * 12;
    return (monthlyTotal - annualTotal).toFixed(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {t('pricing.subtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="flex flex-row items-center justify-center mb-8 space-x-8">
            {/* Monthly/Annual Toggle */}
            <div className="flex items-center">
              <span className={`mr-3 text-lg ${!isAnnual ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                {t('pricing.monthly')}
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative inline-flex h-8 w-16 items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-9' : 'translate-x-1'
                    }`}
                />
              </button>
              <span className={`ml-3 text-lg ${isAnnual ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                {t('pricing.annual')}
              </span>
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                {t('pricing.save')}
              </span>
            </div>

            {/* Regular/Student Toggle */}
            <div className="flex items-center">
              <span className={`mr-3 text-lg ${!isStudent ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                {t('pricing.regularPricing', 'Regular')}
              </span>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    alert('Please sign in to access student pricing');
                    return;
                  }
                  if (!hasEduEmail) {
                    // Don't show alert, the icon tooltip handles it
                    return;
                  }
                  setIsStudent(!isStudent);
                }}
                disabled={!isAuthenticated || !hasEduEmail}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  !isAuthenticated || !hasEduEmail
                    ? 'bg-gradient-to-r from-gray-300 to-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isStudent ? 'translate-x-9' : 'translate-x-1'
                    }`}
                />
              </button>
              <span className={`ml-3 text-lg ${isStudent ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                {t('pricing.studentPricingLabel', 'Student')}
              </span>
              <span className={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                hasEduEmail
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                </svg>
                {hasEduEmail
                  ? `✓ ${eduEmail}`
                  : t('pricing.eduRequired', '.edu required')
                }
              </span>

              {/* Warning icon with tooltip for missing .edu email */}
              {isAuthenticated && !hasEduEmail && (
                <div className="relative group ml-2">
                  <button
                    onClick={() => navigate('/my-profile')}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 hover:bg-yellow-200 transition-colors"
                  >
                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                    </svg>
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 z-10">
                    <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 shadow-lg">
                      <p className="mb-1">No .edu email found.</p>
                      <p className="text-blue-300 font-semibold">Click to add .edu email in profile →</p>
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Promo Code Section */}
          <div className="flex items-center justify-center mb-8">
            {!showCouponInput ? (
              <button
                onClick={() => setShowCouponInput(true)}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {t('pricing.havePromoCode', 'Have a promo code?')}
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={t('pricing.enterPromoCode', 'Enter promo code')}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {couponCode && (
                  <span className="text-green-600 font-medium">{t('pricing.codeAppliedAtCheckout', '✓ Code will be applied at checkout')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Individual Plans Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            {t('pricing.individualPlans', 'Individual Plans')}
          </h2>
          <p className="text-center text-gray-600 mb-10">
            {t('pricing.individualPlansDesc', 'Perfect for students, researchers, and knowledge workers')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {individualPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl ${plan.highlighted
                  ? 'ring-2 ring-blue-500 shadow-2xl scale-105'
                  : 'border border-gray-200 shadow-lg hover:shadow-xl'
                  } bg-white transition-all duration-300 hover:-translate-y-1`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 text-sm font-medium text-white text-center">
                    {t('pricing.mostPopular')}
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <div className="flex items-baseline">
                        <span className="text-5xl font-extrabold text-gray-900">
                          {t('pricing.free', 'Free')}
                        </span>
                      </div>
                    ) : (
                      <>
                        {isStudent && (plan.id === 'starter' || plan.id === 'advanced' || plan.id === 'pro') ? (
                          <div>
                            <div className="mb-1">
                              <span className="text-2xl line-through text-gray-400 block">
                                ${plan.price.toFixed(2)}/mo
                              </span>
                            </div>
                            <div className="flex items-baseline">
                              <span className="text-5xl font-extrabold text-gray-900">
                                ${formatPrice(plan)}
                              </span>
                              <span className="text-xl text-gray-500 ml-2">
                                {t('pricing.perMonth')}
                              </span>
                            </div>
                            {isAnnual && (
                              <div className="text-sm text-gray-500 mt-1">
                                ({t('pricing.billedAnnually')})
                              </div>
                            )}
                          </div>
                        ) : isAnnual ? (
                          <div>
                            <div className="mb-1">
                              <span className="text-2xl line-through text-gray-400 block">
                                ${plan.price.toFixed(2)}/mo
                              </span>
                            </div>
                            <div className="flex items-baseline">
                              <span className="text-5xl font-extrabold text-gray-900">
                                ${formatPrice(plan)}
                              </span>
                              <span className="text-xl text-gray-500 ml-2">
                                {t('pricing.perMonth')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              ({t('pricing.billedAnnually')})
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline">
                            <span className="text-5xl font-extrabold text-gray-900">
                              ${formatPrice(plan)}
                            </span>
                            <span className="text-xl text-gray-500 ml-2">
                              {t('pricing.perMonth')}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {/* Badges Section */}
                    <div className="space-y-2">
                      {/* Free Trial Badge for Paid Plans */}
                      {plan.price > 0 && (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-100 border border-green-200">
                          <svg className="w-4 h-4 text-green-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                          </svg>
                          <span className="text-sm font-semibold text-green-700">
                            {t('pricing.freeTrial', '14-day free trial')}
                          </span>
                        </div>
                      )}
                      {/* Student Pricing Available Badge - only show when NOT in student mode */}
                      {!isStudent && (plan.id === 'starter' || plan.id === 'advanced' || plan.id === 'pro') && (
                        <div className="mt-2 inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200">
                          <svg className="w-4 h-4 text-blue-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                          </svg>
                          <span className="text-sm font-semibold text-blue-700">
                            {t('pricing.studentDiscountAvailable', 'Student discount available')}
                          </span>
                        </div>
                      )}
                    </div>
                    {isAnnual && plan.price > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500 line-through">
                          ${plan.price.toFixed(2)}/mo
                        </span>
                        <span className="ml-2 text-sm font-semibold text-green-600">
                          {t('pricing.saveAmount', { amount: calculateSavings(plan) })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-8">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={
                      loading ||
                      (userSubscription?.tier === plan.tier && !userSubscription.cancel_at_period_end)
                    }
                    className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${plan.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      } ${(loading && processingPlan === plan.id) ||
                        (userSubscription?.tier === plan.tier && !userSubscription.cancel_at_period_end)
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                      }`}
                  >
                    {loading && processingPlan === plan.id ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('subscription.processing', 'Processing...')}
                      </span>
                    ) : (
                      getButtonText(plan)
                    )}
                  </button>

                  {/* Annual billing note */}
                  {isAnnual && plan.price > 0 && (
                    <p className="mt-4 text-center text-xs text-gray-500">
                      {t('pricing.billedAnnuallyAs', { amount: (plan.annualPrice * 12).toFixed(2) })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team & Enterprise Plans Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            {t('pricing.teamPlans', 'Team & Enterprise Plans')}
          </h2>
          <p className="text-center text-gray-600 mb-10">
            {t('pricing.teamPlansDesc', 'Built for teams and organizations that need to scale')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {teamPlans.map((plan) => (
              <div
                key={plan.id}
                className="relative rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl bg-white transition-all duration-300 hover:-translate-y-1"
              >
                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-4">
                    {plan.id === 'enterprise' ? (
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">
                          {t('pricing.customPricing', 'Custom Pricing')}
                        </span>
                      </div>
                    ) : (
                      <>
                        {isAnnual ? (
                          <div>
                            <div className="mb-1">
                              <span className="text-2xl line-through text-gray-400 block">
                                ${plan.price.toFixed(2)}/mo
                              </span>
                            </div>
                            <div className="flex items-baseline">
                              <span className="text-5xl font-extrabold text-gray-900">
                                ${formatPrice(plan)}
                              </span>
                              <span className="text-xl text-gray-500 ml-2">
                                /mo
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              ({t('pricing.billedAnnually')})
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline">
                            <span className="text-5xl font-extrabold text-gray-900">
                              ${formatPrice(plan)}
                            </span>
                            <span className="text-xl text-gray-500 ml-2">
                              /mo
                            </span>
                          </div>
                        )}
                        {plan.priceUnit && (
                          <span className="text-sm text-gray-500 block mt-1">
                            {plan.priceUnit}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-8">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={
                      loading ||
                      (userSubscription?.tier === plan.tier && !userSubscription.cancel_at_period_end)
                    }
                    className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 ${(loading && processingPlan === plan.id) ||
                      (userSubscription?.tier === plan.tier && !userSubscription.cancel_at_period_end)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                      }`}
                  >
                    {loading && processingPlan === plan.id ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('subscription.processing', 'Processing...')}
                      </span>
                    ) : (
                      getButtonText(plan)
                    )}
                  </button>

                  {/* Annual billing note */}
                  {isAnnual && plan.id !== 'enterprise' && (
                    <p className="mt-4 text-center text-xs text-gray-500">
                      {t('pricing.billedAnnuallyAs', { amount: (plan.annualPrice * 12).toFixed(2) })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Discounts Section - Hidden, now integrated with toggle */}
        {false && (
        <div className="mb-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">
              {t('pricing.studentDiscounts.title', 'Student Discounts')}
            </h2>
            <p className="text-xl mb-6 text-blue-100">
              {t('pricing.studentDiscounts.subtitle', 'Valid .edu email required')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-2xl font-bold mb-3">{t('pricing.plans.starter.name', 'Starter')}</h3>
                <div className="mb-3">
                  {isAnnual ? (
                    <>
                      <div className="mb-2">
                        <span className="text-xl line-through opacity-60">$3.99</span>
                        <span className="text-3xl font-extrabold ml-2">$3.39<span className="text-lg font-normal">/mo</span></span>
                      </div>
                      <div className="text-xl font-bold">$40.68<span className="text-base font-normal">/year</span></div>
                    </>
                  ) : (
                    <div className="text-4xl font-extrabold mb-2">$3.99<span className="text-xl font-normal">/mo</span></div>
                  )}
                </div>
                <p className="text-blue-100">{t('pricing.studentDiscounts.starterDiscount', '20% off monthly + additional 15% off annual')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-2xl font-bold mb-3">{t('pricing.plans.advanced.name', 'Advanced')}</h3>
                <div className="mb-3">
                  {isAnnual ? (
                    <>
                      <div className="mb-2">
                        <span className="text-xl line-through opacity-60">$14.99</span>
                        <span className="text-3xl font-extrabold ml-2">$12.74<span className="text-lg font-normal">/mo</span></span>
                      </div>
                      <div className="text-xl font-bold">$152.88<span className="text-base font-normal">/year</span></div>
                    </>
                  ) : (
                    <div className="text-4xl font-extrabold mb-2">$14.99<span className="text-xl font-normal">/mo</span></div>
                  )}
                </div>
                <p className="text-blue-100">{t('pricing.studentDiscounts.advancedDiscount', '25% off monthly + additional 15% off annual')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-2xl font-bold mb-3">{t('pricing.plans.pro.name', 'Pro')}</h3>
                <div className="mb-3">
                  {isAnnual ? (
                    <>
                      <div className="mb-2">
                        <span className="text-xl line-through opacity-60">$29.99</span>
                        <span className="text-3xl font-extrabold ml-2">$25.49<span className="text-lg font-normal">/mo</span></span>
                      </div>
                      <div className="text-xl font-bold">$305.88<span className="text-base font-normal">/year</span></div>
                    </>
                  ) : (
                    <div className="text-4xl font-extrabold mb-2">$29.99<span className="text-xl font-normal">/mo</span></div>
                  )}
                </div>
                <p className="text-blue-100">{t('pricing.studentDiscounts.proDiscount', '25% off monthly + additional 15% off annual')}</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Understanding UP Credits Section */}
        <div className="mb-16 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-4xl mb-3 block">💡</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {t('pricing.understandingCredits.title', 'Understanding UP Credits')}
              </h2>
            </div>

            <div className="space-y-4">
              {/* What are UP Credits? */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('whatAre')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{expandedSections.whatAre ? '▼' : '▶'}</span>
                    <span className="font-semibold text-lg text-gray-900">
                      {t('pricing.understandingCredits.whatAre.question', 'What are UP Credits?')}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {t('pricing.clickToExpand', '[Click to expand]')}
                  </span>
                </button>

                {expandedSections.whatAre && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    <p className="text-gray-700 mb-4">
                      {t('pricing.understandingCredits.whatAre.intro', 'UP Credits power all AI features on ProjectUp:')}
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{t('pricing.upCredits.feature1', 'Document analysis and summarization')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{t('pricing.upCredits.feature2', 'AI-powered note generation')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{t('pricing.upCredits.feature3', 'Intelligent project assistance')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{t('pricing.upCredits.feature4', 'Teammate matching with a reason and risk for each pick')}</span>
                      </li>
                    </ul>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">
                        {t('pricing.upCredits.conversion', '1 UP Credit = 100,000 tokens')} {t('pricing.upCredits.conversionDetail', '(~75 pages of analysis)')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly vs Bonus Credits */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('monthlyVsBonus')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{expandedSections.monthlyVsBonus ? '▼' : '▶'}</span>
                    <span className="font-semibold text-lg text-gray-900">
                      {t('pricing.understandingCredits.monthlyVsBonus.question', 'Monthly vs Bonus Credits')}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {t('pricing.clickToExpand', '[Click to expand]')}
                  </span>
                </button>

                {expandedSections.monthlyVsBonus && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    <div className="grid md:grid-cols-2 gap-6 mb-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center mb-3">
                          <span className="text-2xl mr-2">📅</span>
                          <h4 className="font-semibold text-gray-900">
                            {t('pricing.understandingCredits.monthlyVsBonus.monthly.title', 'Monthly UP Credits (included in plans)')}
                          </h4>
                        </div>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('pricing.understandingCredits.monthlyVsBonus.monthly.refresh', 'Refresh every billing cycle')}</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('pricing.understandingCredits.monthlyVsBonus.monthly.noRollover', "Don't roll over to next month")}</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('pricing.understandingCredits.monthlyVsBonus.monthly.bestFor', 'Best for regular usage')}</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center mb-3">
                          <span className="text-2xl mr-2">💎</span>
                          <h4 className="font-semibold text-gray-900">
                            {t('pricing.understandingCredits.monthlyVsBonus.bonus.title', 'Bonus UP Credits (purchase separately)')}
                          </h4>
                        </div>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('pricing.understandingCredits.monthlyVsBonus.bonus.neverExpire', 'Never expire')}</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('pricing.understandingCredits.monthlyVsBonus.bonus.useAnytime', 'Use anytime, even after canceling')}</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('pricing.understandingCredits.monthlyVsBonus.bonus.stack', 'Stack with monthly credits')}</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{t('pricing.understandingCredits.monthlyVsBonus.bonus.perfect', 'Perfect for occasional heavy usage')}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-900">
                        <strong>{t('pricing.understandingCredits.monthlyVsBonus.priority', 'Usage Priority:')}</strong>{' '}
                        {t('pricing.understandingCredits.monthlyVsBonus.priorityDesc', 'Monthly credits are used first, then Bonus credits.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* How many credits do I need? */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('howMany')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{expandedSections.howMany ? '▼' : '▶'}</span>
                    <span className="font-semibold text-lg text-gray-900">
                      {t('pricing.understandingCredits.howMany.question', 'How many credits do I need?')}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {t('pricing.clickToExpand', '[Click to expand]')}
                  </span>
                </button>

                {expandedSections.howMany && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {t('pricing.understandingCredits.howMany.typicalUsage', 'Typical Usage Examples:')}
                    </h4>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">
                          {t('pricing.understandingCredits.howMany.example1', 'Analyze a 20-page PDF: ~0.3 credits')}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">
                          {t('pricing.understandingCredits.howMany.example2', 'Match teammates for one open role: ~0.5 credits')}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">
                          {t('pricing.understandingCredits.howMany.example3', 'AI project assistant (1 hour): ~2-5 credits')}
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">
                          {t('pricing.understandingCredits.howMany.example4', 'Shape an idea into a project with the AI coach: ~3-8 credits')}
                        </span>
                      </li>
                    </ul>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-gray-900 mb-2">
                        <strong>{t('pricing.understandingCredits.howMany.mostStudents', 'Most students use 20-50 credits/month')}</strong>
                      </p>
                      <p className="text-gray-900">
                        <strong>{t('pricing.understandingCredits.howMany.powerUsers', 'Power users typically need 80-150 credits/month')}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Additional Credits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            {t('pricing.purchaseCredits.title', 'Purchase Additional Credits')}
          </h2>
          <p className="text-center text-gray-600 mb-10">
            {t('pricing.purchaseCredits.subtitle', 'Buy credits anytime to supplement your monthly allocation')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-300">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('pricing.purchaseCredits.packCredits', '{{count}} Credits', { count: 10 })}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-gray-900">$9</span>
                </div>
                <p className="text-gray-600 mb-4">{t('pricing.purchaseCredits.perCredit', '${{price}} per credit', { price: '0.90' })}</p>
                <button className="w-full py-3 px-6 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all">
                  {t('pricing.purchaseCredits.purchase', 'Purchase')}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-blue-500 p-6 shadow-xl transform scale-105 relative">
              <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 text-sm font-medium text-white text-center">
                {t('pricing.bestValue', 'Best Value')}
              </div>
              <div className="text-center mt-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('pricing.purchaseCredits.packCredits', '{{count}} Credits', { count: 50 })}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-gray-900">$40</span>
                </div>
                <p className="text-gray-600 mb-4">{t('pricing.purchaseCredits.perCredit', '${{price}} per credit', { price: '0.80' })}</p>
                <button className="w-full py-3 px-6 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all">
                  {t('pricing.purchaseCredits.purchase', 'Purchase')}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-300">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('pricing.purchaseCredits.packCredits', '{{count}} Credits', { count: 100 })}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-gray-900">$75</span>
                </div>
                <p className="text-gray-600 mb-4">{t('pricing.purchaseCredits.perCredit', '${{price}} per credit', { price: '0.75' })}</p>
                <button className="w-full py-3 px-6 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all">
                  {t('pricing.purchaseCredits.purchase', 'Purchase')}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-2">
              {t('pricing.purchaseCredits.customVolumes', 'Need larger volumes?')}
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              {t('pricing.purchaseCredits.contactSales', 'Contact sales for custom volumes')}
            </button>
          </div>
        </div>

        {/* Benefits of Annual Billing */}
        {isAnnual && (
          <div className="mb-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
              {t('pricing.annualBenefitsTitle', 'Benefits of Annual Billing')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{t('pricing.savingsBenefit', '20% Savings')}</h4>
                <p className="text-sm text-gray-600">{t('pricing.savingsBenefitDesc', 'Get 2 months free with annual billing')}</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{t('pricing.priceLockBenefit', 'Price Lock')}</h4>
                <p className="text-sm text-gray-600">{t('pricing.priceLockBenefitDesc', 'Lock in your rate for the entire year')}</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{t('pricing.prioritySupportBenefit', 'Priority Support')}</h4>
                <p className="text-sm text-gray-600">{t('pricing.prioritySupportBenefitDesc', 'Annual customers get priority support')}</p>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            {t('pricing.faq.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.upCreditsRunOut.question', 'What happens if I run out of UP Credits?')}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.upCreditsRunOut.answer', 'You can purchase additional UP Credits anytime, or upgrade to a higher plan. Your work is never lost.')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.upCreditsRollover.question', 'Do unused UP Credits roll over?')}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.upCreditsRollover.answer', 'No, UP Credits refresh monthly. Consider purchasing à la carte credits if you need flexibility.')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.changePlans.question', 'Can I change plans anytime?')}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.changePlans.answer', 'Yes, upgrade or downgrade anytime. Prorated charges/credits applied automatically.')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.teamIsolatedSetup.question', "What's included in the $499 setup fee for Team Isolated?")}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.teamIsolatedSetup.answer', 'Server deployment, custom domain configuration, environment setup, initial agent customization, and team onboarding session.')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.deploymentTime.question', 'How long does Team Isolated deployment take?')}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.deploymentTime.answer', 'Typically 3-5 business days after payment and initial consultation.')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.teamCreditsShared.question', 'Do Team plans share UP Credits?')}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.teamCreditsShared.answer', 'No, each team member gets their own monthly UP Credit allocation.')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.freeTrial.question', 'Is there a free trial?')}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.freeTrial.answer', 'Yes! All paid plans include a 14-day free trial. No credit card required to start.')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('pricing.faq.paymentMethods.question', 'What payment methods do you accept?')}
              </h3>
              <p className="text-gray-600">
                {t('pricing.faq.paymentMethods.answer', 'We accept all major credit cards, PayPal, and wire transfers for Enterprise plans.')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">
            {t('pricing.footerNote', 'All prices are in USD. Prices exclude applicable taxes.')}
          </p>
          <p className="text-gray-600">
            {t('pricing.needHelp', 'Need help choosing?')}{' '}
            <button
              onClick={() => navigate('/contact')}
              className="text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              {t('pricing.contactTeam', 'Contact our team')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;