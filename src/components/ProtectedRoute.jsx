import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      setChecked(true);
      if (!isAuthenticated) {
        navigate('/auth');
      }
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading || !checked) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
};

export default ProtectedRoute;