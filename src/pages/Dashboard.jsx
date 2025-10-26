import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Eye, MessageCircle, Edit, Bookmark, User, Calendar, IndianRupee, Search, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/helpers';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import PropertyCard from '@/components/property/PropertyCard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's properties
      const propertiesResponse = await api.get('/properties');
      console.log('All properties:', propertiesResponse.data.data);
      console.log('User ID:', user?.id);
      
      const userProperties = propertiesResponse.data.data.filter(
        property => {
          // Handle different ID formats
          const ownerId = property.owner?._id || property.owner;
          // Ensure user and user.id exist before comparison
          if (!user || !user.id) return false;
          const isOwner = ownerId && (
            ownerId === user.id || 
            ownerId.toString() === user.id || 
            (user.id.toString && ownerId.toString() === user.id.toString())
          );
          console.log('Property owner ID:', ownerId, 'User ID:', user.id, 'Is owner:', isOwner);
          return isOwner;
        }
      );
      
      console.log('User properties:', userProperties);
      
      // Fetch user's bookings
      const bookingsResponse = await api.get('/bookings');
      const userBookings = bookingsResponse.data.data.filter(
        booking => {
          // Handle different ID formats for tenant
          const tenantId = booking.tenant?._id || booking.tenant;
          // Ensure user and user.id exist before comparison
          if (!user || !user.id) return false;
          return tenantId && (
            tenantId === user.id || 
            tenantId.toString() === user.id || 
            (user.id.toString && tenantId.toString() === user.id.toString())
          );
        }
      );
      
      setProperties(userProperties);
      setBookings(userBookings);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'available': return 'default';
      case 'rented': return 'secondary';
      case 'unavailable': return 'outline';
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'rented': return 'Rented';
      case 'unavailable': return 'Unavailable';
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Available';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name || 'User'}</p>
          </div>
          <Button onClick={() => navigate('/profile')} className="gap-2">
            <User className="h-4 w-4" />
            View Profile
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">My Properties</p>
                  <p className="text-2xl font-bold">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bookmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">My Bookings</p>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/browse-properties')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Browse Properties</p>
                  <p className="text-2xl font-bold">→</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Updated Messages card to navigate to /chat instead of /messages */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/chat')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold">→</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Properties Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">My Properties</h2>
            <p className="text-muted-foreground">Manage your listed properties</p>
          </div>
          <Button onClick={() => navigate('/post-property')} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Property
          </Button>
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
            {properties.slice(0, 3).map((property) => (
              <PropertyCard
                key={property._id}
                property={property}
                getStatusVariant={getStatusVariant}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        )}
      </div>

      {/* My Bookings Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">My Bookings</h2>
          <p className="text-muted-foreground">View and manage your property bookings</p>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-4">Browse properties and make your first booking</p>
              <Button onClick={() => navigate('/browse-properties')}>
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bookings.slice(0, 2).map((booking) => (
              <Card key={booking._id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{booking.property.title}</h3>
                      <p className="text-sm text-muted-foreground">{booking.property.location}, {booking.property.city}</p>
                    </div>
                    <Badge variant={getStatusVariant(booking.status)}>
                      {getStatusText(booking.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Booking Date</p>
                      <p className="font-medium">{new Date(booking.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{formatCurrency(booking.totalPrice)}</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/booking/${booking._id}`)}
                    className="w-full"
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;