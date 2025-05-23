// ProfileCreationForm.jsx
import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Tabs, Tab } from 'react-bootstrap';
import axios from 'axios';

const ProfileCreationForm = () => {
  const [profile, setProfile] = useState({
    name: '',
    description: '',
    phone_source: 'new',
    area_code: '',
    country_code: 'US',
    phone_number: ''
  });
  
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [existingNumbers, setExistingNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  useEffect(() => {
    // Fetch existing phone numbers from the user's Twilio account
    fetchExistingNumbers();
  }, []);
  
  const fetchExistingNumbers = async () => {
    try {
      const response = await axios.get('/api/twilio/phone-numbers');
      setExistingNumbers(response.data.phone_numbers);
    } catch (err) {
      console.error('Failed to fetch existing phone numbers', err);
    }
  };
  
  const searchPhoneNumbers = async () => {
    if (!profile.area_code) {
      setError('Area code is required to search for phone numbers');
      return;
    }
    
    try {
      setSearchingNumbers(true);
      setError(null);
      
      const response = await axios.get('/api/twilio/phone-numbers/available', {
        params: {
          area_code: profile.area_code,
          country: profile.country_code
        }
      });
      
      setAvailableNumbers(response.data.available_numbers);
      
      if (response.data.available_numbers.length === 0) {
        setError(`No available numbers found for area code ${profile.area_code}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search for phone numbers');
    } finally {
      setSearchingNumbers(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('/api/profiles', profile);
      
      setSuccess('Profile created successfully!');
      // Reset form or redirect
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value
    });
  };
  
  const selectPhoneNumber = (number) => {
    setProfile({
      ...profile,
      phone_number: number
    });
  };
  
  return (
    <Card>
      <Card.Header>
        <h4>Create New Profile</h4>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Profile Name</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              placeholder="e.g. Business Profile"
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              name="description"
              value={profile.description}
              onChange={handleChange}
              placeholder="Profile description (optional)"
              rows={3}
            />
          </Form.Group>
          
          <h5 className="mt-4">Phone Number</h5>
          <Tabs 
            activeKey={profile.phone_source}
            onSelect={(k) => setProfile({...profile, phone_source: k, phone_number: ''})}
            className="mb-3"
          >
            <Tab eventKey="new" title="Purchase New Number">
              <Form.Group className="mb-3">
                <Form.Label>Area Code</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    name="area_code"
                    value={profile.area_code}
                    onChange={handleChange}
                    placeholder="e.g. 415"
                    className="me-2"
                  />
                  <Button 
                    variant="outline-primary" 
                    onClick={searchPhoneNumbers}
                    disabled={searchingNumbers}
                  >
                    {searchingNumbers ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </Form.Group>
              
              {availableNumbers.length > 0 && (
                <div className="mt-3">
                  <h6>Available Phone Numbers</h6>
                  <div className="phone-number-list">
                    {availableNumbers.map((number, index) => (
                      <div 
                        key={index}
                        className={`phone-number-item ${profile.phone_number === number.phone_number ? 'selected' : ''}`}
                        onClick={() => selectPhoneNumber(number.phone_number)}
                      >
                        <div>{number.phone_number}</div>
                        <div className="text-muted small">{number.locality}, {number.region}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Tab>
            
            <Tab eventKey="existing" title="Use Existing Number">
              {existingNumbers.length > 0 ? (
                <div>
                  <h6>Your Existing Phone Numbers</h6>
                  <div className="phone-number-list">
                    {existingNumbers.map((number, index) => (
                      <div 
                        key={index}
                        className={`phone-number-item ${profile.phone_number === number.phone_number ? 'selected' : ''}`}
                        onClick={() => selectPhoneNumber(number.phone_number)}
                      >
                        <div>{number.phone_number}</div>
                        <div className="text-muted small">{number.friendly_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>You don't have any existing phone numbers in your Twilio account.</p>
              )}
            </Tab>
            
            <Tab eventKey="manual" title="Enter Manually">
              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="text"
                  name="phone_number"
                  value={profile.phone_number}
                  onChange={handleChange}
                  placeholder="e.g. +14155552671"
                  required
                />
                <Form.Text className="text-muted">
                  Enter a phone number that you have configured separately in Twilio or another provider.
                </Form.Text>
              </Form.Group>
            </Tab>
          </Tabs>
          
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading || (!profile.phone_number && profile.phone_source !== 'new')}
            className="mt-3"
          >
            {loading ? 'Creating...' : 'Create Profile'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ProfileCreationForm;