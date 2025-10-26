import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, IndianRupee, Building, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings/my-bookings');
      console.log('Bookings response:', response.data);
      
      // Log each booking for detailed inspection
      if (response.data.data) {
        response.data.data.forEach((booking, index) => {
          console.log(`Booking ${index}:`, JSON.stringify(booking, null, 2));
        });
      }
      
      setBookings(response.data.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings');
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleChatWithOwner = async (propertyId, ownerId) => {
    if (!user) {
      toast.error('Please log in to chat with the property owner');
      navigate('/auth');
      return;
    }
    
    // Validate that we have the required information
    if (!propertyId || !ownerId) {
      toast.error('Unable to initiate chat - missing property or owner information');
      console.error('Missing property or owner information:', { propertyId, ownerId });
      return;
    }
    
    try {
      console.log('Initiating chat with:', { recipientId: ownerId, propertyId });
      
      // Create or get existing chat with the property owner
      const response = await api.post('/chats', {
        recipientId: ownerId,
        propertyId: propertyId
      });
      
      console.log('Chat creation response:', response.data);
      
      // Navigate to chat page with the conversation
      // Pass the chat ID and property ID as URL parameters
      if (response.data.data && response.data.data._id) {
        navigate(`/chat?chatId=${response.data.data._id}&propertyId=${propertyId}`);
        toast.success('Chat opened with property owner');
      } else {
        // Fallback navigation
        navigate(`/chat?propertyId=${propertyId}`);
        toast.success('Chat opened with property owner');
      }
    } catch (error) {
      console.error('Error initiating chat:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      const errorMessage = error.response?.data?.message || 'Failed to initiate chat with owner';
      toast.error(errorMessage);
    }
  };

  // Function to extract owner ID from booking data with improved logic
  const extractOwnerId = (booking) => {
    // Try different possible locations for owner ID with better checking
    if (booking.owner && typeof booking.owner === 'object' && booking.owner._id) {
      console.log('Found owner ID in booking.owner._id:', booking.owner._id);
      return booking.owner._id;
    }
    if (booking.owner && typeof booking.owner === 'string') {
      console.log('Found owner ID as string in booking.owner:', booking.owner);
      return booking.owner;
    }
    if (booking.property && booking.property.owner && typeof booking.property.owner === 'object' && booking.property.owner._id) {
      console.log('Found owner ID in booking.property.owner._id:', booking.property.owner._id);
      return booking.property.owner._id;
    }
    if (booking.property && booking.property.owner && typeof booking.property.owner === 'string') {
      console.log('Found owner ID as string in booking.property.owner:', booking.property.owner);
      return booking.property.owner;
    }
    console.log('No owner ID found in booking:', booking);
    return null;
  };

  // Function to extract property ID from booking data with improved logic
  const extractPropertyId = (booking) => {
    // Try different possible locations for property ID with better checking
    if (booking.property && typeof booking.property === 'object' && booking.property._id) {
      console.log('Found property ID in booking.property._id:', booking.property._id);
      return booking.property._id;
    }
    if (booking.property && typeof booking.property === 'string') {
      console.log('Found property ID as string in booking.property:', booking.property);
      // Check if it looks like a valid ObjectId
      if (booking.property.match(/^[0-9a-fA-F]{24}$/)) {
        return booking.property;
      }
    }
    if (booking.propertyId) {
      console.log('Found property ID in booking.propertyId:', booking.propertyId);
      return booking.propertyId;
    }
    console.log('No property ID found in booking:', booking);
    return null;
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center p-8 rounded-xl bg-card border shadow-sm max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to view your bookings.
            </p>
            <Button>
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
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your property bookings
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p>Loading your bookings...</p>
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
              You haven't made any property bookings yet.
            </p>
            <Button>
              <Link to="/properties">Browse Properties</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => {
            // Get owner ID using the extraction function
            const ownerId = extractOwnerId(booking);
            // Get property ID using the extraction function
            const propertyId = extractPropertyId(booking);
            
            console.log('Booking data:', booking);
            console.log('Property ID:', propertyId);
            console.log('Owner ID:', ownerId);
            
            return (
              <Card key={booking._id} className="rounded-xl border overflow-hidden">
                <CardHeader className="p-0">
                  <div className="h-32 bg-muted relative">
                    {booking.property?.images?.[0] ? (
                      <img 
                        src={booking.property.images[0]} 
                        alt={booking.property.title}
                        className="w-full h-full object-contain"
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
                  
                  {/* Chat with owner button */}
                  {ownerId && propertyId ? (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4 rounded-lg flex items-center gap-2"
                      onClick={() => handleChatWithOwner(propertyId, ownerId)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat with Owner
                    </Button>
                  ) : (
                    <div className="w-full mt-4 rounded-lg flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full rounded-lg flex items-center gap-2"
                        disabled
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chat Unavailable
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Property: {propertyId ? 'Yes' : 'No'}, Owner: {ownerId ? 'Yes' : 'No'}
                      </p>
                      {(!propertyId || !ownerId) && (
                        <p className="text-xs text-muted-foreground text-center">
                          {(!propertyId && !ownerId) ? 'Property and owner data missing' : 
                           !propertyId ? 'Property data missing' : 
                           'Owner data missing'}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;