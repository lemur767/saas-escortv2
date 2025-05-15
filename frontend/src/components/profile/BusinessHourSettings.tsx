import React, { useState, useEffect, useCallback } from 'react';
import type { BusinessHours, DayOfWeek } from '../../types';
import { toast } from 'react-toastify';
import { setBusinessHours } from '../../api/profiles';

interface BusinessHoursSettingsProps {
  profileId: number;
  initialBusinessHours?: BusinessHours;
  onUpdate: (businessHours: BusinessHours) => void;
}

// Define days of week as a constant array
const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

// Default business hours configuration
const DEFAULT_HOURS: BusinessHours = {
  monday: { start: '10:00', end: '22:00' },
  tuesday: { start: '10:00', end: '22:00' },
  wednesday: { start: '10:00', end: '22:00' },
  thursday: { start: '10:00', end: '22:00' },
  friday: { start: '10:00', end: '22:00' },
  saturday: { start: '12:00', end: '22:00' },
  sunday: { start: '12:00', end: '22:00' },
};

const BusinessHoursSettings: React.FC<BusinessHoursSettingsProps> = ({ 
  profileId,
  initialBusinessHours,
  onUpdate
}) => {
  const [businessHours, setBusinessHoursState] = useState<BusinessHours>(
    initialBusinessHours || DEFAULT_HOURS
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeErrors, setTimeErrors] = useState<Record<string, string>>({});
  
  // Initialize business hours when props change
  useEffect(() => {
    if (initialBusinessHours) {
      setBusinessHoursState(initialBusinessHours);
    }
  }, [initialBusinessHours]);
  
  // Handle time change with proper validation
  const handleTimeChange = useCallback((day: DayOfWeek, field: 'start' | 'end', value: string) => {
    setBusinessHoursState(prev => {
      const updatedHours = {
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value
        }
      };
      
      // Validate times (ensure start is before end)
      validateTimes(updatedHours);
      
      return updatedHours;
    });
  }, []);
  
  // Validate that end time is after start time for each day
  const validateTimes = useCallback((hours: BusinessHours) => {
    const newErrors: Record<string, string> = {};
    
    Object.entries(hours).forEach(([day, dayHours]) => {
      if (dayHours) {
        const startTime = dayHours.start;
        const endTime = dayHours.end;
        
        if (startTime && endTime) {
          // Parse times for comparison
          const startDate = new Date(`2000-01-01T${startTime}`);
          const endDate = new Date(`2000-01-01T${endTime}`);
          
          if (endDate <= startDate) {
            newErrors[`${day}`] = 'End time must be after start time';
          }
        }
      }
    });
    
    setTimeErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);
  
  // Handle day toggle
  const handleDayToggle = useCallback((day: DayOfWeek, isEnabled: boolean) => {
    setBusinessHoursState(prev => {
      if (isEnabled) {
        // Enable day with default hours
        return {
          ...prev,
          [day]: DEFAULT_HOURS[day]
        };
      } else {
        // Disable day by removing it
        const newHours = { ...prev };
        delete newHours[day];
        return newHours;
      }
    });
  }, []);
  
  // Handle save with validation
  const handleSave = useCallback(async () => {
    // Validate all times before saving
    if (!validateTimes(businessHours)) {
      toast.error('Please fix time errors before saving');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await setBusinessHours(profileId, businessHours);
      onUpdate(businessHours);
      toast.success('Business hours updated successfully');
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error('Failed to update business hours');
    } finally {
      setIsSubmitting(false);
    }
  }, [businessHours, onUpdate, profileId, validateTimes]);
  
  // Format day name for display
  const formatDayName = (day: string): string => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h3>
        <p className="text-gray-600 mb-6">
          Set the hours when AI responses are active. Outside these hours, an out-of-office message will be sent.
        </p>
        
        <div className="space-y-6">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-full sm:w-1/4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                    checked={!!businessHours[day]}
                    onChange={(e) => handleDayToggle(day, e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className="ml-2 text-gray-700 font-medium">{formatDayName(day)}</span>
                </label>
              </div>
              
              <div className="w-full sm:w-3/4 flex flex-col sm:flex-row gap-4">
                {businessHours[day] ? (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        className={`form-input w-full sm:w-32 ${
                          timeErrors[day] ? 'border-red-300 focus:border-red-300 focus:ring-red-500' : ''
                        }`}
                        value={businessHours[day]?.start || ''}
                        onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        className={`form-input w-full sm:w-32 ${
                          timeErrors[day] ? 'border-red-300 focus:border-red-300 focus:ring-red-500' : ''
                        }`}
                        value={businessHours[day]?.end || ''}
                        onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    {timeErrors[day] && (
                      <div className="text-sm text-red-600 self-end">
                        {timeErrors[day]}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-500 italic self-center">Not available</div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
          <button
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSubmitting || Object.keys(timeErrors).length > 0}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : 'Save Business Hours'}
          </button>
        </div>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Tip:</strong> Setting appropriate business hours helps manage client expectations and prevents automated responses at times when you're not available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BusinessHoursSettings);