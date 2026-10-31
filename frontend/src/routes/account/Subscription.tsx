import React from 'react';
import SubscriptionManagement from '../../components/profile/SubscriptionManagement';

const Subscription: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <SubscriptionManagement />
      </div>
    </div>
  );
};

export default Subscription;