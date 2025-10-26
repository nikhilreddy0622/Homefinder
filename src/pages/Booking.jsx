import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, IndianRupee, User, Phone, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/utils/helpers';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Booking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real booking data from API
  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bookings/${id}`);
      setBooking(response.data.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'confirmed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'cancelled': return 'Cancelled';
      default: return 'Confirmed';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Booking Not Found</h2>
          <p className="text-muted-foreground mb-6">The booking you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Booking Details */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Booking Details</CardTitle>
                  <CardDescription>Booking ID: #{booking._id}</CardDescription>
                </div>
                <Button variant={getStatusVariant(booking.status)}>
                  {getStatusText(booking.status)}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Booking Period</h3>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Start Date: {new Date(booking.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>End Date: {new Date(booking.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Payment Details</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <IndianRupee className="h-4 w-4" />
                    <span>{formatCurrency(booking.property?.price || 0)} per month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    <span className="font-semibold">{formatCurrency(booking.totalPrice || booking.totalAmount || 0)} total</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden">
                  {booking.property?.images && booking.property.images.length > 0 ? (
                    <img 
                      src={booking.property.images[0]} 
                      alt={booking.property.title}
                      className="w-full h-full object-cover"
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
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{booking.property?.title || 'Property Title'}</h3>
                  <p className="text-muted-foreground">{booking.property?.location || 'Property Location'}, {booking.property?.city || ''}</p>
                  <div className="mt-2 font-semibold">
                    {formatCurrency(booking.property?.price || 0)}
                    <span className="text-sm font-normal">/month</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Contact Information */}
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{booking.tenant?.name || 'Tenant Name'}</div>
                  <div className="text-sm text-muted-foreground">Tenant</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{booking.tenant?.phone || 'Phone not available'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{booking.tenant?.email || 'Email not available'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Owner Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{booking.owner?.name || 'Owner Name'}</div>
                  <div className="text-sm text-muted-foreground">Property Owner</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{booking.owner?.phone || 'Phone not available'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{booking.owner?.email || 'Email not available'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Booking;