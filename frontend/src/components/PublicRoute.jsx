import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export function PublicRoute({ children }) {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Only check once when component mounts or route changes
    const checkAuth = () => {
      const userId = localStorage.getItem('userId');
      const user = localStorage.getItem('user');

      // Only redirect if both userId and user exist
      if (userId && user) {
        try {
          // Verify the user data is valid JSON
          const userData = JSON.parse(user);
          // Also verify userId matches
          if (userData.id === userId) {
            setShouldRedirect(true);
          } else {
            // Mismatch, clear invalid data
            localStorage.removeItem('userId');
            localStorage.removeItem('user');
            setShouldRedirect(false);
          }
        } catch (e) {
          // Invalid user data, clear it
          localStorage.removeItem('userId');
          localStorage.removeItem('user');
          setShouldRedirect(false);
        }
      } else {
        setShouldRedirect(false);
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [location.pathname]); // Only re-check when route changes

  // Show nothing while checking to prevent flicker
  if (isChecking) {
    return null;
  }

  // If user is already authenticated, redirect to dashboard
  if (shouldRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
