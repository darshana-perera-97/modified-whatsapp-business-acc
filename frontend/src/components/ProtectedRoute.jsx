import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const userId = localStorage.getItem('userId');
  const user = localStorage.getItem('user');

  // If user is not authenticated, redirect to login
  if (!userId || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
