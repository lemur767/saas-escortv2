// hooks/useRecentActivities.js
import { useState, useEffect, useRef, useCallback } from 'react';

// Custom hook for managing recent activities with real-time updates
export const useRecentActivities = (profileId: unknown, options = {}) => {
  const {
    limit = 20,
    autoRefresh = true,
    pollInterval = 30000, // 30 seconds
    enableWebSocket = true
  } = options;

  // State management
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Refs for cleanup
  const ws = useRef(null);
  const pollTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // API client with abort capability
  const fetchWithAbort = useCallback(async (url, options = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    return fetch(url, {
      ...options,
      signal: abortControllerRef.current.signal,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }, []);

  // Fetch activities from API
  const fetchActivities = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        profile_id: profileId || 'all',
        offset: reset ? '0' : activities.length.toString()
      });
      
      const response = await fetchWithAbort(`/api/activities/recent?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setActivities(prev => reset ? data.activities : [...prev, ...data.activities]);
      setUnreadCount(data.unread_count || 0);
      setHasMore(data.has_more || false);
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities');
      }
    } finally {
      setLoading(false);
    }
  }, [profileId, limit, activities.length, fetchWithAbort]);

  // WebSocket setup and management
  useEffect(() => {
    if (!enableWebSocket || !autoRefresh) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const wscurrent = new WebSocket(wsUrl);

      wscurrent.onopen = () => {
        console.log('WebSocket connected for activities');
        wscurrent.send(JSON.stringify({
          type: 'subscribe',
          channel: 'activities',
          profile_id: profileId
        }));
      };

      wscurrent.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_activity') {
            setActivities(prev => [data.activity, ...prev]);
            setUnreadCount(prev => prev + 1);
          } else if (data.type === 'activity_updated') {
            setActivities(prev => 
              prev.map(activity => 
                activity.id === data.activity.id ? data.activity : activity
              )
            );
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wscurrent.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wscurrent.onclose = (event) => {
        console.log('WebSocket closed:', event);
        // Attempt to reconnect after 5 seconds
        if (!event.wasClean) {
          setTimeout(connectWebSocket, 5000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wscurrent) {
        wscurrent.close();
      }
    };
  }, [profileId, autoRefresh, enableWebSocket]);

  // Polling fallback when WebSocket is not enabled
  useEffect(() => {
    if (!autoRefresh || enableWebSocket) return;

    const poll = () => {
      pollTimeoutRef.current = setTimeout(() => {
        fetchActivities(true);
        poll();
      }, pollInterval);
    };

    poll();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [autoRefresh, enableWebSocket, pollInterval, fetchActivities]);

  // Initial fetch
  useEffect(() => {
    fetchActivities(true);
  }, [profileId, limit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Mark activities as read
  const markAsRead = useCallback(async (activityIds = null) => {
    try {
      const body = {
        profile_id: profileId,
        activity_ids: activityIds || activities.filter(a => !a.is_read).map(a => a.id)
      };
      
      await fetchWithAbort('/api/activities/mark-read', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      setUnreadCount(0);
      setActivities
      prev.map(activity => ({
          ...activity,
          is_read: activityIds ? activityIds.includes(activity.id) : true
        }))
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, [profileId, activities, fetchWithAbort]);

  // Load more activities
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchActivities(false);
    }
  }, [loading, hasMore, fetchActivities]);

  // Refresh activities
  const refresh = useCallback(() => {
    fetchActivities(true);
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    unreadCount,
    hasMore,
    markAsRead,
    loadMore,
    refresh
  };
};