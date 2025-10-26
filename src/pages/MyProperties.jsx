import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/helpers';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  MapPin, 
  Eye, 
  MessageCircle, 
  Edit, 
  Trash2, 
  PlusCircle,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import PropertyCard from '@/components/property/PropertyCard';

const MyProperties = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      // First get user's properties
      const propertiesResponse = await api.get('/properties/my-properties');
      const userProperties = propertiesResponse.data.data || [];
      
      // For each property, check if it has active bookings
      const propertiesWithBookingInfo = await Promise.all(
        userProperties.map(async (property) => {
          try {
            // Get bookings for this specific property
            const bookingsResponse = await api.get(`/bookings/my-property-bookings`);
            const allBookings = bookingsResponse.data.data || [];
            
            // Filter bookings for this specific property
            const propertyBookings = allBookings.filter(booking => 
              booking.property && 
              (booking.property._id === property._id || booking.property === property._id)
            );
            
            // Check if there are any confirmed bookings
            const activeBookings = propertyBookings.filter(booking => 
              booking.status === 'confirmed' && new Date(booking.endDate) > new Date()
            );
            
            return {
              ...property,
              isBooked: activeBookings.length > 0,
              activeBookings: activeBookings
            };
          } catch (error) {
            console.error(`Error fetching bookings for property ${property._id}:`, error);
            return {
              ...property,
              isBooked: false,
              activeBookings: []
            };
          }
        })
      );
      
      setProperties(propertiesWithBookingInfo);
    } catch (error) {
      console.error('Error fetching properties:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      toast.error('Failed to load your properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/properties/${id}`);
      setProperties(prev => prev.filter(property => property._id !== id));
      toast.success('Property deleted successfully!');
    } catch (error) {
      console.error('Error deleting property:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      toast.error('Failed to delete property. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusVariant = (status, isBooked) => {
    if (isBooked) return 'destructive';
    switch (status) {
      case 'available': return 'default';
      case 'rented': return 'secondary';
      case 'unavailable': return 'outline';
      default: return 'default';
    }
  };

  const getStatusText = (status, isBooked) => {
    if (isBooked) return 'Booked';
    switch (status) {
      case 'available': return 'Available';
      case 'rented': return 'Rented';
      case 'unavailable': return 'Unavailable';
      default: return 'Available';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p>Loading your properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Properties</h1>
            <p className="text-muted-foreground">Manage your listed properties</p>
          </div>
          <Button onClick={() => navigate('/post-property')} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Property
          </Button>
        </div>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first property</p>
            <Button onClick={() => navigate('/post-property')}>
              Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard
              key={property._id}
              property={property}
              showDelete={true}
              onDelete={handleDelete}
              deletingId={deletingId}
              getStatusVariant={getStatusVariant}
              getStatusText={getStatusText}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProperties;