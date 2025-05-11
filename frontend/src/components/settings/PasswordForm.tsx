import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { changePassword } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';

interface PasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ onSuccess, onCancel }) => {
  const { logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<PasswordFormData>();
  
  const newPassword = watch('new_password', '');
  
  // Password validation rules
  const passwordRules = {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters'
    },
    validate: (value: string) => {
      // Check for uppercase letter
      if (!/[A-Z]/.test(value)) {
        return 'Password must include at least one uppercase letter';
      }
      
      // Check for number
      if (!/[0-9]/.test(value)) {
        return 'Password must include at least one number';
      }
      
      // Check for special character
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        return 'Password must include at least one special character';
      }
      
      return true;
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: PasswordFormData) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password
      });
      
      toast.success('Password changed successfully');
      reset();
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Force logout after password change
      setTimeout(() => {
        toast.info('Please log in with your new password');
        logout();
      }, 2000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      if (error.response?.status === 401) {
        toast.error('Current password is incorrect');
      } else {
        toast.error(error.response?.data?.error || 'Failed to change password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle form reset
  const handleCancel = () => {
    reset();
    if (onCancel) {
      onCancel();
    }
  };
  
  // Calculate password strength
  const calculatePasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: 'None', color: 'bg-gray-200' };
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    
    // Map strength to label and color
    let label = '';
    let color = '';
    
    switch(true) {
      case (strength <= 1):
        label = 'Weak';
        color = 'bg-red-500';
        break;
      case (strength <= 3):
        label = 'Medium';
        color = 'bg-yellow-500';
        break;
      case (strength <= 4):
        label = 'Strong';
        color = 'bg-green-500';
        break;
      case (strength >= 5):
        label = 'Very Strong';
        color = 'bg-green-600';
        break;
      default:
        label = 'Weak';
        color = 'bg-red-500';
    }
    
    return { strength, label, color };
  };
  
  const passwordStrength = calculatePasswordStrength(newPassword);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
        <p className="mt-1 text-sm text-gray-500">
          Update your password to maintain account security.
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Current Password */}
        <div>
          <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <input
            id="current_password"
            type="password"
            autoComplete="current-password"
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              errors.current_password ? 'border-red-300' : 'border-gray-300'
            }`}
            {...register('current_password', { required: 'Current password is required' })}
            disabled={isSubmitting}
          />
          {errors.current_password && (
            <p className="mt-2 text-sm text-red-600">{errors.current_password.message}</p>
          )}
        </div>
        
        {/* New Password */}
        <div>
          <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            id="new_password"
            type="password"
            autoComplete="new-password"
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              errors.new_password ? 'border-red-300' : 'border-gray-300'
            }`}
            {...register('new_password', passwordRules)}
            disabled={isSubmitting}
          />
          {errors.new_password && (
            <p className="mt-2 text-sm text-red-600">{errors.new_password.message}</p>
          )}
          
          {/* Password strength meter */}
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Password strength:</span>
                <span className={`text-xs font-medium ${
                  passwordStrength.strength <= 1 ? 'text-red-600' : 
                  passwordStrength.strength <= 3 ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${passwordStrength.color}`} 
                  style={{ width: `${Math.min(100, (passwordStrength.strength / 5) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              errors.confirm_password ? 'border-red-300' : 'border-gray-300'
            }`}
            {...register('confirm_password', { 
              required: 'Please confirm your password',
              validate: value => value === newPassword || 'Passwords do not match'
            })}
            disabled={isSubmitting}
          />
          {errors.confirm_password && (
            <p className="mt-2 text-sm text-red-600">{errors.confirm_password.message}</p>
          )}
        </div>
      </div>
      
      {/* Password requirements */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-gray-900">Password Requirements</h4>
        <div className="mt-2 text-sm text-gray-600">
          <ul className="list-disc pl-5 space-y-1">
            <li className={`${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-600'}`}>
              Minimum 8 characters long
            </li>
            <li className={`${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}`}>
              Include at least one uppercase letter
            </li>
            <li className={`${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}`}>
              Include at least one number
            </li>
            <li className={`${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}`}>
              Include at least one special character
            </li>
          </ul>
        </div>
      </div>
      
      {/* Form actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating Password...
            </>
          ) : 'Change Password'}
        </button>
      </div>
    </form>
  );
};

export default PasswordForm;