import type { UsageSummary } from '../../types';

interface StatsSummaryProps {
  usage: UsageSummary;
}

const StatsSummary: React.FC<StatsSummaryProps> = ({ usage }) => {
  const { ai_responses_used, ai_responses_limit, percentage_used, days_remaining } = usage;
  
  // Calculate status color based on usage percentage
  const getStatusColor = () => {
    if (percentage_used < 50) return 'bg-green-100 text-green-800';
    if (percentage_used < 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Usage Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Responses Usage */}
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 mb-1">AI Responses</p>
          <div className="flex items-center justify-between mb-2">
            <p className="text-2xl font-bold text-gray-900">{ai_responses_used} / {ai_responses_limit}</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {percentage_used}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${percentage_used < 80 ? 'bg-indigo-600' : 'bg-red-600'}`}
              style={{ width: `${percentage_used}%` }}
            ></div>
          </div>
        </div>
        
        {/* Billing Cycle */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Current Billing Cycle</p>
          <p className="text-2xl font-bold text-gray-900">{days_remaining} days remaining</p>
        </div>
        
        {/* Upgrade Button */}
        <div className="flex flex-col justify-center">
          {percentage_used > 70 && (
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              onClick={() => window.location.href = '/billing'}
            >
              Upgrade Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsSummary;