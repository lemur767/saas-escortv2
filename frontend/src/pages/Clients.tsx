import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllClients, searchClients, toggleClientBlock, markClientAsRegular } from '../api/clients';
import { getProfiles } from '../api/profiles';
import type { Client, Profile } from '../types';

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'blocked' | 'regular'>('all');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Fetch clients and profiles
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch clients
        const clientsData = await getAllClients();
        setClients(clientsData);
        
        // Fetch profiles
        const profilesData = await getProfiles();
        setProfiles(profilesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load client data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search query is empty, fetch all clients
      try {
        const clientsData = await getAllClients();
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to fetch clients');
      }
      return;
    }
    
    try {
      setIsLoading(true);
      const results = await searchClients(searchQuery);
      setClients(results);
    } catch (error) {
      console.error('Error searching clients:', error);
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (type: 'all' | 'blocked' | 'regular') => {
    setFilterType(type);
    fetchFilteredClients(type);
  };

  // Fetch filtered clients
  const fetchFilteredClients = async (type: 'all' | 'blocked' | 'regular') => {
    try {
      setIsLoading(true);
      let clientsData: Client[];
      
      switch (type) {
        case 'blocked':
          clientsData = await getAllClients(); // Replace with getBlockedClients() when available
          clientsData = clientsData.filter(client => client.is_blocked);
          break;
        case 'regular':
          clientsData = await getAllClients(); // Replace with getRegularClients() when available
          clientsData = clientsData.filter(client => client.is_regular);
          break;
        default:
          clientsData = await getAllClients();
      }
      
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching filtered clients:', error);
      toast.error('Failed to filter clients');
    } finally {
      setIsLoading(false);
    }
  };

  // Show block dialog
  const openBlockDialog = (client: Client) => {
    setSelectedClient(client);
    setBlockReason('');
    setShowBlockDialog(true);
  };

  // Handle block/unblock client
  const handleToggleBlock = async () => {
    if (!selectedClient) return;
    
    setIsSubmitting(true);
    try {
      await toggleClientBlock(
        selectedClient.phone_number, 
        !selectedClient.is_blocked,
        !selectedClient.is_blocked ? blockReason : undefined
      );
      
      // Update client in state
      setClients(clients.map(client => 
        client.phone_number === selectedClient.phone_number
          ? { ...client, is_blocked: !client.is_blocked }
          : client
      ));
      
      setShowBlockDialog(false);
      toast.success(
        selectedClient.is_blocked
          ? 'Client unblocked successfully'
          : 'Client blocked successfully'
      );
    } catch (error) {
      console.error('Error toggling block status:', error);
      toast.error('Failed to update block status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle mark as regular/not regular
  const handleToggleRegular = async (client: Client) => {
    try {
      await markClientAsRegular(client.phone_number, !client.is_regular);
      
      // Update client in state
      setClients(clients.map(c => 
        c.phone_number === client.phone_number
          ? { ...c, is_regular: !c.is_regular }
          : c
      ));
      
      toast.success(
        client.is_regular
          ? 'Client marked as not regular'
          : 'Client marked as regular'
      );
    } catch (error) {
      console.error('Error updating regular status:', error);
      toast.error('Failed to update client status');
    }
  };

  // Navigate to conversation
  const navigateToConversation = (client: Client) => {
    // If there's only one profile, navigate directly to that conversation
    if (profiles.length === 1) {
      navigate(`/conversations/${profiles[0].id}/${client.phone_number}`);
      return;
    }
    
    // If there are multiple profiles, navigate to the client's page
    // This would typically show conversations across all profiles
    // But for now, just navigate to the first profile's conversation
    if (profiles.length > 0) {
      navigate(`/conversations/${profiles[0].id}/${client.phone_number}`);
    } else {
      toast.error('No profiles available to view conversations');
    }
  };

  // Filter clients based on current filter type
  const filteredClients = searchQuery
    ? clients // If there's a search query, don't filter the search results
    : filterType === 'all'
      ? clients
      : filterType === 'blocked'
        ? clients.filter(client => client.is_blocked)
        : clients.filter(client => client.is_regular);

  if (isLoading && clients.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Client Management</h1>
        <p className="text-gray-600">
          View and manage all clients who have contacted your profiles.
        </p>
      </div>
      
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/2">
            <div className="relative">
              <input
                type="text"
                className="form-input pl-10 w-full"
                placeholder="Search by phone number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={handleSearch}
              >
                <span className="text-sm text-indigo-600 hover:text-indigo-900">Search</span>
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filterType === 'all'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleFilterChange('all')}
            >
              All Clients
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filterType === 'blocked'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleFilterChange('blocked')}
            >
              Blocked
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filterType === 'regular'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleFilterChange('regular')}
            >
              Regular
            </button>
          </div>
        </div>
      </div>
      
      {/* Client list */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? `No results found for "${searchQuery}"`
                : filterType === 'blocked'
                  ? "You don't have any blocked clients"
                  : filterType === 'regular'
                    ? "You don't have any regular clients"
                    : "No clients have contacted your profiles yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr 
                    key={client.phone_number} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigateToConversation(client)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-800 font-medium text-lg">
                            {client.name ? client.name[0].toUpperCase() : client.phone_number[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.name || 'Unnamed Client'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.phone_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {client.is_blocked ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Blocked
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                        
                        {client.is_regular && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            Regular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.last_contact_date
                        ? new Date(client.last_contact_date).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRegular(client);
                          }}
                        >
                          {client.is_regular ? 'Remove Regular' : 'Mark Regular'}
                        </button>
                        <button
                          className={client.is_blocked ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (client.is_blocked) {
                              // Unblock directly
                              handleToggleBlock();
                            } else {
                              // Open block dialog for confirmation
                              openBlockDialog(client);
                            }
                          }}
                        >
                          {client.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Block dialog */}
      {showBlockDialog && selectedClient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Block Client</h3>
            <p className="mb-4 text-gray-600">
              Blocking {selectedClient.name || selectedClient.phone_number} will prevent them from sending messages to any of your profiles.
            </p>
            
            <div className="mb-4">
              <label htmlFor="blockReason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <textarea
                id="blockReason"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Reason for blocking this client"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-outline"
                onClick={() => setShowBlockDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleToggleBlock}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Blocking...' : 'Block Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;