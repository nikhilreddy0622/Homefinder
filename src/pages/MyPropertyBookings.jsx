import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building, MapPin, IndianRupee, Calendar, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MyPropertyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyPropertyBookings = async () => {
      try {
        setLoading(true);
        // Fetch bookings made by others for properties owned by the current user
        const response = await api.get('/bookings/my-property-bookings');
        setBookings(response.data.data || []);
      } catch (err) {
        setError('Failed to load bookings for your properties');
        console.error('Error fetching property bookings:', err);
        toast.error('Failed to load bookings for your properties. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMyPropertyBookings();
    }
  }, [user]);

  const handleChatWithTenant = (propertyId, tenantId) => {
    // Navigate to chat page with the tenant
    navigate(`/chat?userId=${tenantId}&propertyId=${propertyId}`);
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center p-8 rounded-xl bg-card border shadow-sm max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to view bookings for your properties.
            </p>
            <Button asChild>
              <Link to="/auth">Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bookings for My Properties</h1>
        <p className="text-muted-foreground mt-2">
          View and manage bookings made by others for your properties
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p>Loading bookings for your properties...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      ) : bookings.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6">
              No one has booked your properties yet.
            </p>
            <Button asChild>
              <Link to="/my-properties">View My Properties</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <Card key={booking._id} className="rounded-xl border overflow-hidden">
              <CardHeader className="p-0">
                <div className="h-32 bg-muted relative">
                  {booking.property?.images?.[0] ? (
                    <img 
                      src={booking.property.images[0]} 
                      alt={booking.property.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error('Image failed to load for property:', booking.property.title);
                        console.error('Image URL:', booking.property.images[0]);
                        console.error('Error:', e);
                        // Set a fallback image
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJyZ2JhKDIwMCwgMjAwLCAyMDAsIDAuMikiLz4KPHBhdGggZD0iTTEyLjAwMDIgMTUuMzg0NkMxMy42NzAxIDE1LjM4NDYgMTUuMDAwMiAxNC4wNTQ1IDE1LjAwMDIgMTIuMzg0NkMxNS4wMDAyIDEwLjcxNDcgMTMuNjcwMSA5LjM4NDU4IDEyLjAwMDIgOS4zODQ1OEMxMC4zMzAzIDkuMzg0NTggOS4wMDAyNCAxMC43MTQ3IDkuMDAwMjQgMTIuMzg0NkM5LjAwMDI0IDE0LjA1NDUgMTAuMzMwMyAxNS4zODQ2IDEyLjAwMDIgMTUuMzg0NloiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTEyLjAwMDIgMTUuMzg0NkMxMy42NzAxIDE1LjM4NDYgMTUuMDAwMiAxNC4wNTQ1IDE1LjAwMDIgMTIuMzg0NkMxNS4wMDAyIDEwLjcxNDcgMTMuNjcwMSA5LjM4NDU4IDEyLjAwMDIgOS4zODQ1OEMxMC4zMzAzIDkuMzg0NTggOS4wMDAyNCAxMC43MTQ3IDkuMDAwMjQgMTIuMzg0NkM5LjAwMDI0IDE0LjA1NDUgMTAuMzMwMyAxNS4zODQ2IDEyLjAwMDIgMTUuMzg0NloiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Building className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg line-clamp-1 mb-2">
                  {booking.property?.title || 'Property'}
                </CardTitle>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">
                      {booking.property?.location || 'Location'}, {booking.property?.city || 'City'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <IndianRupee className="h-4 w-4" />
                    <span>
                      {booking.totalPrice?.toLocaleString('en-IN') || 'N/A'} total
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {booking.startDate 
                        ? new Date(booking.startDate).toLocaleDateString() 
                        : 'N/A'} - {
                      booking.endDate 
                        ? new Date(booking.endDate).toLocaleDateString() 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="text-sm font-medium mb-1">Booked by:</div>
                  <div className="text-sm text-muted-foreground">
                    {booking.tenant?.name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {booking.tenant?.email || 'No email provided'}
                  </div>
                </div>
                
                <div className="mt-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : booking.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                  </span>
                </div>
                
                {/* Chat with tenant button */}
                <Button 
                  variant="outline" 
                  className="w-full mt-4 rounded-lg flex items-center gap-2"
                  onClick={() => handleChatWithTenant(
                    booking.property._id, 
                    booking.tenant._id || booking.tenant
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with Tenant
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPropertyBookings;