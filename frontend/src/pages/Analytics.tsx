import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getProfiles } from '../api/profiles';
import { getMessageStats } from '../api/messages';
import { getUsageRecords } from '../api/billing';
import type { Profile, UsageRecord } from '../types';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MessageStats {
  dates: string[];
  incoming: number[];
  outgoing: number[];
  ai_generated: number[];
}

const Analytics = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'all'>('all');
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('week');
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const profilesData = await getProfiles();
        setProfiles(profilesData);
        
        // If there's only one profile, select it automatically
        if (profilesData.length === 1) {
          setSelectedProfileId(profilesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
        toast.error('Failed to load profiles');
      }
    };
    
    fetchProfiles();
  }, []);
  
  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        
        // Get message stats for selected profile or all profiles
        const profileId = selectedProfileId === 'all' ? undefined : selectedProfileId;
        
        // These would be actual API calls in a real implementation
        // For now, we'll generate mock data
        const mockMessageStats = generateMockMessageStats(timePeriod);
        setMessageStats(mockMessageStats);
        
        // Get usage records
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 30); // Last 30 days
        
        const mockUsageRecords = generateMockUsageRecords();
        setUsageRecords(mockUsageRecords);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [selectedProfileId, timePeriod]);
  
  // Generate mock message stats data
  const generateMockMessageStats = (period: 'day' | 'week' | 'month'): MessageStats => {
    const dates: string[] = [];
    const incoming: number[] = [];
    const outgoing: number[] = [];
    const ai_generated: number[] = [];
    
    const numDays = period === 'day' ? 24 : period === 'week' ? 7 : 30;
    const today = new Date();
    
    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      
      if (period === 'day') {
        // Last 24 hours
        date.setHours(today.getHours() - (numDays - 1 - i));
        dates.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        // Last 7 days or 30 days
        date.setDate(today.getDate() - (numDays - 1 - i));
        dates.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      }
      
      // Generate random numbers for message counts
      const base = Math.floor(Math.random() * 10) + 5;
      incoming.push(base + Math.floor(Math.random() * 10));
      const outgoingTotal = base - 2 + Math.floor(Math.random() * 8);
      outgoing.push(outgoingTotal);
      ai_generated.push(Math.floor(outgoingTotal * 0.7)); // 70% of outgoing are AI-generated
    }
    
    return { dates, incoming, outgoing, ai_generated };
  };
  
  // Generate mock usage records
  const generateMockUsageRecords = (): UsageRecord[] => {
    const records: UsageRecord[] = [];
    
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - (29 - i));
      
      records.push({
        date: date.toISOString().split('T')[0],
        ai_responses_count: Math.floor(Math.random() * 50) + 10,
        messages_sent_count: Math.floor(Math.random() * 80) + 20,
        messages_received_count: Math.floor(Math.random() * 100) + 30
      });
    }
    
    return records;
  };
  
  // Prepare message stats chart data
  const messageChartData: ChartData<'line'> = {
    labels: messageStats?.dates || [],
    datasets: [
      {
        label: 'Incoming Messages',
        data: messageStats?.incoming || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.2
      },
      {
        label: 'Outgoing Messages',
        data: messageStats?.outgoing || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.2
      },
      {
        label: 'AI-Generated',
        data: messageStats?.ai_generated || [],
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.2
      }
    ]
  };
  
  // Prepare usage chart data
  const usageChartData: ChartData<'bar'> = {
    labels: usageRecords.map(record => record.date.substring(5)),
    datasets: [
      {
        label: 'AI Responses',
        data: usageRecords.map(record => record.ai_responses_count),
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
      }
    ]
  };
  
  // Calculate total stats
  const calculateTotals = () => {
    if (!messageStats) return { incoming: 0, outgoing: 0, ai: 0, ratio: 0 };
    
    const totalIncoming = messageStats.incoming.reduce((sum, count) => sum + count, 0);
    const totalOutgoing = messageStats.outgoing.reduce((sum, count) => sum + count, 0);
    const totalAI = messageStats.ai_generated.reduce((sum, count) => sum + count, 0);
    const aiRatio = totalOutgoing > 0 ? Math.round((totalAI / totalOutgoing) * 100) : 0;
    
    return {
      incoming: totalIncoming,
      outgoing: totalOutgoing,
      ai: totalAI,
      ratio: aiRatio
    };
  };
  
  const totals = calculateTotals();
  
  if (isLoading && !messageStats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Analytics</h1>
        <p className="text-gray-600">
          View message statistics and usage analytics.
        </p>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <label htmlFor="profile-select" className="block text-sm font-medium text-gray-700 mb-1">
              Profile
            </label>
            <select
              id="profile-select"
              className="form-select rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={selectedProfileId === 'all' ? 'all' : selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
              <option value="all">All Profiles</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="time-period" className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  timePeriod === 'day'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                onClick={() => setTimePeriod('day')}
              >
                24 Hours
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  timePeriod === 'week'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                onClick={() => setTimePeriod('week')}
              >
                7 Days
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  timePeriod === 'month'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                onClick={() => setTimePeriod('month')}
              >
                30 Days
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Incoming Messages</h3>
          <div className="flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{totals.incoming}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Outgoing Messages</h3>
          <div className="flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{totals.outgoing}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">AI Responses</h3>
          <div className="flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{totals.ai}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">AI Response Ratio</h3>
          <div className="flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{totals.ratio}%</p>
            <p className="ml-2 text-sm text-gray-600">of outgoing</p>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Message Activity</h3>
          <div className="h-80">
            <Line 
              data={messageChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">AI Usage</h3>
          <div className="h-80">
            <Bar
              data={usageChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Additional Analytics */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Top Performing Hours</h3>
        <p className="text-gray-600 mb-4">
          Times when your profiles receive the most messages.
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Usage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { time: '8:00 PM - 10:00 PM', messages: 87, rate: '93%', ai: '76%' },
                { time: '6:00 PM - 8:00 PM', messages: 73, rate: '89%', ai: '82%' },
                { time: '10:00 PM - 12:00 AM', messages: 65, rate: '91%', ai: '79%' },
                { time: '4:00 PM - 6:00 PM', messages: 58, rate: '86%', ai: '74%' },
                { time: '2:00 PM - 4:00 PM', messages: 42, rate: '88%', ai: '71%' }
              ].map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.messages}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.rate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.ai}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;