/**
 * Token Refresh Utility - Automatically manages JWT token lifecycle
 * 
 * Purpose:
 * - Detect expired tokens (401 responses)
 * - Use refresh_token to get new access_token
 * - Retry failed requests with new token
 * - Prevent token expiration altogether with proactive refresh
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_REFRESH_INTERVAL = 20 * 60 * 1000; // Refresh every 20 minutes (token expires in 24 hours)

interface RefreshResponse {
  data?: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  success?: boolean;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    
    if (!refreshToken) {
      console.debug('No refresh token available');
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.ok) {
      const data: RefreshResponse = await response.json();
      
      // Handle both response formats:
      // 1. Nested: data.data.access_token (from /auth/verify-otp)
      // 2. Top-level: data.access_token (from /auth/refresh)
      const accessToken = data?.data?.access_token || data?.access_token;
      const newRefreshToken = data?.data?.refresh_token || data?.refresh_token;
      
      if (accessToken) {
        // Update tokens in localStorage
        localStorage.setItem('access_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }
        console.debug('Token refreshed successfully');
        return true;
      } else {
        console.error('No access token in refresh response:', data);
        return false;
      }
    } else if (response.status === 401) {
      // Refresh token is also invalid - need to login again
      console.debug('Refresh token invalid, clearing auth');
      clearAuth();
      return false;
    } else {
      console.error(`Token refresh failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

/**
 * Clear all authentication data
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

/**
 * Start automatic token refresh interval
 * Should be called on login or app initialization
 */
export function startTokenRefreshInterval(): () => void {
  const interval = setInterval(() => {
    refreshAccessToken();
  }, TOKEN_REFRESH_INTERVAL);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Fetch wrapper that handles 401 errors by refreshing token and retrying
 * 
 * Usage:
 * const response = await fetchWithTokenRefresh('/api/v1/users/profile', {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 */
export async function fetchWithTokenRefresh(
  url: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> {
  const response = await fetch(url, options);

  // If we get a 401, try refreshing the token and retrying
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    
    if (refreshed) {
      // Token was refreshed, retry with new token
      const newAccessToken = localStorage.getItem('access_token');
      
      if (newAccessToken) {
        const retryOptions = {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        };
        
        return fetch(url, retryOptions);
      }
    }
  }

  return response;
}
