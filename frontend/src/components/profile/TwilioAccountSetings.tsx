// TwilioAccountSettings.jsx
import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Form, Button, Alert, Table } from 'react-bootstrap';
import axios from 'axios';

const TwilioAccountSettings = () => {
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('status');
  const [externalAccount, setExternalAccount] = useState({ account_sid: '', auth_token: '' });
  const [usageData, setUsageData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const fetchAccountInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/twilio/account');
      setAccountInfo(response.data);
      if (response.data.has_account) {
        fetchUsageData();
      }
    } catch (err) {
      setError('Failed to fetch account information');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageData = async () => {
    try {
      const response = await axios.get('/api/twilio/usage');
      setUsageData(response.data.usage);
    } catch (err) {
      console.error('Failed to fetch usage data', err);
    }
  };

  const createSubaccount = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('/api/twilio/account/subaccount');
      setAccountInfo({
        has_account: true,
        account_sid: response.data.account_sid,
        api_key_sid: response.data.api_key_sid,
        account_type: 'subaccount',
        using_parent_account: true
      });
      
      setSuccess('Twilio subaccount created successfully');
      fetchUsageData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create Twilio subaccount');
    } finally {
      setLoading(false);
    }
  };

  const connectExternalAccount = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!externalAccount.account_sid || !externalAccount.auth_token) {
        setError('Account SID and Auth Token are required');
        setLoading(false);
        return;
      }
      
      const response = await axios.post('/api/twilio/account/external', externalAccount);
      setAccountInfo({
        has_account: true,
        account_sid: response.data.account_sid,
        api_key_sid: response.data.api_key_sid,
        account_type: 'external',
        using_parent_account: false
      });
      
      setSuccess('External Twilio account connected successfully');
      fetchUsageData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect external Twilio account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h4>Twilio Account Settings</h4>
      </Card.Header>
      <Card.Body>
        {loading && <p>Loading...</p>}
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        {!loading && accountInfo && (
          <>
            {accountInfo.has_account ? (
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                <Tab eventKey="status" title="Account Status">
                  <div className="mt-3">
                    <h5>Twilio Account Information</h5>
                    <p><strong>Account SID:</strong> {accountInfo.account_sid}</p>
                    <p><strong>API Key SID:</strong> {accountInfo.api_key_sid}</p>
                    <p><strong>Account Type:</strong> {accountInfo.account_type === 'subaccount' ? 'SMS AI Responder Subaccount' : 'External Twilio Account'}</p>
                    {accountInfo.account_type === 'subaccount' && (
                      <p><small>This account is managed by SMS AI Responder. You don't need to manage billing with Twilio directly.</small></p>
                    )}
                    {accountInfo.account_type === 'external' && (
                      <p><small>This is your own Twilio account. You'll need to manage billing with Twilio directly.</small></p>
                    )}
                  </div>
                </Tab>
                <Tab eventKey="usage" title="Usage & Billing">
                  <div className="mt-3">
                    <h5>Current Usage</h5>
                    {usageData ? (
                      <Table striped bordered>
                        <tbody>
                          <tr>
                            <th>SMS Messages</th>
                            <td>{usageData.sms_count}</td>
                          </tr>
                          <tr>
                            <th>Voice Minutes</th>
                            <td>{usageData.voice_minutes.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Phone Numbers</th>
                            <td>{usageData.phone_numbers}</td>
                          </tr>
                          <tr>
                            <th>Current Bill Amount</th>
                            <td>${usageData.current_bill_amount.toFixed(2)}</td>
                          </tr>
                          {usageData.last_bill_date && (
                            <tr>
                              <th>Last Bill Amount</th>
                              <td>${usageData.last_bill_amount.toFixed(2)} (on {new Date(usageData.last_bill_date).toLocaleDateString()})</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    ) : (
                      <p>Loading usage data...</p>
                    )}
                  </div>
                </Tab>
              </Tabs>
            ) : (
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                <Tab eventKey="create" title="Create New Account">
                  <div className="mt-3">
                    <p>Create a new Twilio account managed by SMS AI Responder. We'll handle the setup and billing for you.</p>
                    <Button 
                      variant="primary" 
                      onClick={createSubaccount}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Twilio Account'}
                    </Button>
                  </div>
                </Tab>
                <Tab eventKey="connect" title="Connect Existing Account">
                  <div className="mt-3">
                    <p>Connect your existing Twilio account. You'll need to provide your Account SID and Auth Token.</p>
                    <Form onSubmit={connectExternalAccount}>
                      <Form.Group className="mb-3">
                        <Form.Label>Account SID</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="AC..."
                          value={externalAccount.account_sid}
                          onChange={(e) => setExternalAccount({...externalAccount, account_sid: e.target.value})}
                          required
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Auth Token</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Auth Token"
                          value={externalAccount.auth_token}
                          onChange={(e) => setExternalAccount({...externalAccount, auth_token: e.target.value})}
                          required
                        />
                        <Form.Text className="text-muted">
                          Your auth token is only used for verification and initial setup. We'll create an API key for future operations.
                        </Form.Text>
                      </Form.Group>
                      <Button 
                        variant="primary" 
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? 'Connecting...' : 'Connect Account'}
                      </Button>
                    </Form>
                  </div>
                </Tab>
              </Tabs>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default TwilioAccountSettings;