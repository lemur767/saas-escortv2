import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { createProfile } from '../../api/profiles';
import type { Profile } from '../../types';

interface NewProfileModalProps {
  onClose: () => void;
  onCreateProfile: (profile: Profile) => void;
}

interface ProfileFormData {
  name: string;
  phone_number: string;
  description?: string;
}

const NewProfileModal: React.FC<NewProfileModalProps> = ({ onClose, onCreateProfile }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>();
  
  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      const newProfile = await createProfile(data);
      onCreateProfile(newProfile);
      toast.success('Profile created successfully');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Create New Profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Profile Name</label>
            <input
              id="name"
              type="text"
              className={`form-input ${errors.name ? 'border-red-300' : ''}`}
              placeholder="e.g., Jessica"
              {...register('name', { required: 'Profile name is required' })}
            />
            {errors.name && (
              <p className="form-error">{errors.name.message}</p>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="phone_number" className="form-label">Phone Number</label>
            <input
              id="phone_number"
              type="text"
              className={`form-input ${errors.phone_number ? 'border-red-300' : ''}`}
              placeholder="e.g., +12125551234"
              {...register('phone_number', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^\+?[1-9]\d{1,14}$/,
                  message: 'Please enter a valid phone number'
                }
              })}
            />
            <p className="mt-1 text-sm text-gray-500">
              Must be a valid phone number in E.164 format (e.g., +12125551234)
            </p>
            {errors.phone_number && (
              <p className="form-error">{errors.phone_number.message}</p>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="description" className="form-label">Description (Optional)</label>
            <textarea
              id="description"
              rows={3}
              className="form-input"
              placeholder="Brief description of this profile"
              {...register('description')}
            />
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProfileModal;