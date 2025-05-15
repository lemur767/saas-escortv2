import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { updateUserProfile } from '../../api/auth';
import type { User } from '../../types';

interface ProfileFormData {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

interface ProfileFormProps {
  user: User;
  onUpdate: (user: User) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors }
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: user.username,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || ''
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      const updatedUser = await updateUserProfile(data);
      onUpdate(updatedUser);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
          <p className="mt-1 text-sm text-gray-500">
            Update your account profile information and email address.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                errors.username ? 'border-red-300' : ''
              }`}
              disabled={true} // Username cannot be changed
              {...register('username', { required: 'Username is required' })}
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                errors.email ? 'border-red-300' : ''
              }`}
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              id="first_name"
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              {...register('first_name')}
            />
          </div>
          
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              id="last_name"
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              {...register('last_name')}
            />
          </div>
          
          <div className="sm:col-span-2">
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
              Phone number
            </label>
            <input
              id="phone_number"
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="+1 (555) 987-6543"
              {...register('phone_number')}
            />
            <p className="mt-2 text-sm text-gray-500">
              Used for account recovery and notifications.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProfileForm;