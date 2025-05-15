import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getSubscriptionPlans, 
  getCurrentSubscription, 
  getInvoices, 
  getUsageSummary,
  createCheckoutSession,
  cancelSubscription
} from '../api/billing';
import type { SubscriptionPlan, Subscription, Invoice, UsageSummary } from '../types';

const Billing = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch billing data
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        const [plansData, subscriptionData, invoicesData, usageData] = await Promise.all([
          getSubscriptionPlans(),
          getCurrentSubscription(),
          getInvoices(),
          getUsageSummary()
        ]);
        
        setPlans(plansData);
        setCurrentSubscription(subscriptionData);
        setInvoices(invoicesData);
        setUsage(usageData);
      } catch (error) {
        console.error('Error fetching billing data:', error);
        toast.error('Failed to load billing information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBillingData();
  }, []);

  // Handle plan selection
  const handleSelectPlan = async (planId: number) => {
    // Don't do anything if selecting the current plan
    if (currentSubscription?.plan.id === planId) return;
    
    setIsChangingPlan(true);
    try {
      const checkoutData = await createCheckoutSession(planId);
      
      // Redirect to Stripe checkout
      window.location.href = checkoutData.checkout_url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to update subscription plan');
      setIsChangingPlan(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      await cancelSubscription(cancelReason);
      
      // Update subscription status
      if (currentSubscription) {
        setCurrentSubscription({
          ...currentSubscription,
          status: 'canceled'
        });
      }
      
      setShowCancelDialog(false);
      toast.success('Subscription cancelled successfully');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Subscription & Billing</h1>
        <p className="text-gray-600">
          Manage your subscription plan, view usage, and access billing history.
        </p>
      </div>
      
      {/* Current Subscription */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Subscription</h2>
        
        {currentSubscription ? (
          <div>
            <div className="flex flex-col md:flex-row justify-between mb-4">
              <div>
                <div className="flex items-center">
                  <h3 className="text-xl font-bold text-gray-900">
                    {currentSubscription.plan.name} Plan
                  </h3>
                  <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                    currentSubscription.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : currentSubscription.status === 'canceled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                  </span>
                </div>
                <p className="text-gray-600 mt-2">
                  {currentSubscription.status === 'active' 
                    ? `Renews on ${formatDate(currentSubscription.end_date)}`
                    : currentSubscription.status === 'canceled'
                      ? `Expires on ${formatDate(currentSubscription.end_date)}`
                      : `Payment due on ${formatDate(currentSubscription.end_date)}`
                  }
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <span className="text-2xl font-bold text-gray-900">${currentSubscription.plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Plan Features</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <li className="flex items-center text-gray-600">
                  <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {currentSubscription.plan.profile_limit === 999 
                    ? 'Unlimited Profiles'
                    : `${currentSubscription.plan.profile_limit} Profiles`
                  }
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {currentSubscription.plan.ai_responses_limit === 999999 
                    ? 'Unlimited AI Responses'
                    : `${currentSubscription.plan.ai_responses_limit.toLocaleString()} AI Responses/month`
                  }
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {currentSubscription.plan.message_history_days} days message history
                </li>
                {currentSubscription.plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            
            {currentSubscription.status === 'active' && (
              <div className="mt-6">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">You don't have an active subscription.</p>
            <button
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              onClick={() => window.location.href = '#subscription-plans'}
            >
              Choose a Plan
            </button>
          </div>
        )}
      </div>
      
      {/* Usage Summary */}
      {usage && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Usage</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">AI Responses</h3>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold text-gray-900">{usage.ai_responses_used}</span>
                  <span className="text-gray-600"> / {usage.ai_responses_limit}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  usage.percentage_used < 50
                    ? 'bg-green-100 text-green-800'
                    : usage.percentage_used < 80
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {usage.percentage_used}% Used
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    usage.percentage_used < 80 ? 'bg-indigo-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${usage.percentage_used}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {usage.days_remaining} days left in current billing cycle
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Account Status</h3>
              <p className="text-gray-600">
                {currentSubscription?.status === 'active' ? (
                  <span className="text-green-600 font-medium">Your account is active and in good standing</span>
                ) : currentSubscription?.status === 'canceled' ? (
                  <span className="text-red-600 font-medium">Your subscription has been canceled</span>
                ) : (
                  <span className="text-yellow-600 font-medium">Your account has a pending payment</span>
                )}
              </p>
              
              {usage.percentage_used > 80 && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        You're approaching your AI response limit. Consider upgrading your plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Subscription Plans */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6" id="subscription-plans">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscription Plans</h2>
        
        {plans.length === 0 ? (
          <p className="text-gray-600 text-center py-4">Loading subscription plans...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan => (
              <div 
                key={plan.id} 
                className={`border rounded-lg overflow-hidden ${
                  currentSubscription?.plan.id === plan.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">
                        {plan.profile_limit === 999 
                          ? 'Unlimited Profiles'
                          : `${plan.profile_limit} Profiles`
                        }
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">
                        {plan.ai_responses_limit === 999999 
                          ? 'Unlimited AI Responses'
                          : `${plan.ai_responses_limit.toLocaleString()} AI Responses/month`
                        }
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">
                        {plan.message_history_days} days message history
                      </span>
                    </li>
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
                      currentSubscription?.plan.id === plan.id
                        ? 'bg-gray-100 text-gray-800 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={currentSubscription?.plan.id === plan.id || isChangingPlan}
                  >
                    {currentSubscription?.plan.id === plan.id
                      ? 'Current Plan'
                      : isChangingPlan
                        ? 'Processing...'
                        : currentSubscription
                          ? 'Switch to This Plan'
                          : 'Select Plan'
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Billing History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Billing History</h2>
        
        {invoices.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No billing history available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'open'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invoice.invoice_pdf_url && (
                        <a 
                          href={invoice.invoice_pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Cancel Subscription</h3>
            <p className="mb-4 text-gray-600">
              Are you sure you want to cancel your subscription? You'll still have access to your account until the end of your current billing period on {formatDate(currentSubscription?.end_date || '')}.
            </p>
            
            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation (Optional)
              </label>
              <textarea
                id="cancelReason"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please let us know why you're cancelling"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
              >
                Keep Subscription
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;