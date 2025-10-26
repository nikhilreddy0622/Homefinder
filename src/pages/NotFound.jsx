import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Building2 } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-muted-foreground mb-6">Page Not Found</p>
        </div>
        
        <p className="text-lg mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button>
            <Link to="/">Go Home</Link>
          </Button>
          <Button variant="outline">
            <Link to="/properties">Browse Properties</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;