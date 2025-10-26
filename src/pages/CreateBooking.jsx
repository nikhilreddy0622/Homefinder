import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, IndianRupee, User, Phone, Mail, ArrowLeft, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/utils/helpers';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CreateBooking = () => {
  const { id } = useParams(); // Property ID
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [moveInDate, setMoveInDate] = useState(null);
  const [leaseDuration, setLeaseDuration] = useState('12');
  const [errors, setErrors] = useState({});
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [availabilityChecking, setAvailabilityChecking] = useState(false);

  // Fetch property details
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (id) {
      fetchProperty();
    }
  }, [isAuthenticated, navigate, id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/properties/${id}`);
      const p = response.data.data;
      
      // Check if the current user is the owner of the property
      // Ensure proper comparison of user IDs
      const ownerId = p.owner?._id || p.owner;
      const isOwner = user && (user.id === ownerId || user._id === ownerId);
      
      if (isOwner) {
        toast.error("You cannot book your own property");
        navigate(`/property/${id}`);
        return;
      }
      
      setProperty({
        _id: p._id,
        id: p._id,
        title: p.title,
        city: p.city,
        area: p.location,
        bhk: `${p.bedrooms || 1} BHK`,
        furnishing: p.furnishing || 'Unfurnished',
        rent: p.price,
        deposit: p.deposit || Math.round((p.price || 0) * 2),
        type: p.propertyType,
        availability: p.availableFrom ? new Date(p.availableFrom) : new Date(),
        availableFrom: p.availableFrom ? new Date(p.availableFrom) : new Date(),
        images: p.images?.length ? p.images : ['/placeholder.jpg'],
        address: p.location,
        description: p.description || '',
        amenities: p.amenities || [],
        owner: { 
          id: ownerId,
          name: p.owner?.name || 'Owner', 
          phone: p.owner?.phone || '', 
          email: p.owner?.email || '' 
        },
      });
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property details');
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  };

  const checkPropertyAvailability = async (startDate, endDate) => {
    try {
      setAvailabilityChecking(true);
      const response = await api.post(`/properties/${id}/check-availability`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      return response.data.data.isAvailable;
    } catch (error) {
      console.error('Error checking property availability:', error);
      toast.error('Failed to check property availability');
      return false;
    } finally {
      setAvailabilityChecking(false);
    }
  };

  const validateForm = async () => {
    const newErrors = {};
    
    if (!moveInDate) {
      newErrors.moveInDate = 'Move-in date is required';
    } else {
      const availabilityDate = property?.availableFrom || new Date();
      if (moveInDate < availabilityDate) {
        newErrors.moveInDate = `This property is only available from ${formatDate(availabilityDate)}`;
      } else {
        // Check if property is available for the selected dates
        const months = parseInt(leaseDuration);
        const endDate = new Date(moveInDate);
        endDate.setMonth(endDate.getMonth() + months);
        
        const isAvailable = await checkPropertyAvailability(moveInDate, endDate);
        if (!isAvailable) {
          newErrors.moveInDate = 'This property is already booked for the selected dates';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDemoBooking = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      toast.error('Please fix the errors before proceeding');
      return;
    }

    setBookingLoading(true);
    setErrors({});
    
    try {
      const months = parseInt(leaseDuration);
      const totalRent = property.rent * months;
      const totalWithFees = totalRent + property.deposit + 499;
      
      // Calculate end date
      const startDate = moveInDate;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      const response = await api.post('/bookings/demo-booking', {
        propertyId: id,
        moveInDate: startDate.toISOString(), // Send as ISO string
        leaseDuration: months,
        monthlyRent: property.rent,
        totalRent: totalRent,
        securityDeposit: property.deposit,
        platformFee: 499,
        totalAmount: totalWithFees
      });

      if (response.data.success) {
        setBookingData({
          startDate,
          endDate,
          leaseDuration: months,
          totalAmount: totalWithFees
        });
        setBookingComplete(true);
        toast.success('🎉 Demo booking confirmed! (No payment required)');
      }
    } catch (error) {
      console.error('Demo booking error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create booking';
      toast.error(errorMessage);
      // Set specific error if it's about availability
      if (errorMessage.includes('available from')) {
        setErrors({ moveInDate: errorMessage });
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Function to handle chat with owner
  const handleChatWithOwner = async () => {
    if (!property || !property.owner || !property.owner.id) {
      toast.error('Unable to initiate chat - missing owner information');
      return;
    }

    try {
      // Create or get existing chat with the property owner
      const response = await api.post('/chats', {
        recipientId: property.owner.id,
        propertyId: property.id
      });
      
      console.log('Chat creation response:', response.data);
      
      // Navigate to chat page with the conversation
      if (response.data.data && response.data.data._id) {
        navigate(`/chat?chatId=${response.data.data._id}&propertyId=${property.id}`);
        toast.success('Chat opened with property owner');
      } else {
        // Fallback navigation
        navigate(`/chat?propertyId=${property.id}&userId=${property.owner.id}`);
        toast.success('Chat opened with property owner');
      }
    } catch (error) {
      console.error('Error initiating chat:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      const errorMessage = error.response?.data?.message || 'Failed to initiate chat with owner';
      toast.error(errorMessage);
      // Fallback to general chat page
      navigate('/chat');
    }
  };

  const leaseEndDate = moveInDate ? new Date(moveInDate.getFullYear(), moveInDate.getMonth() + parseInt(leaseDuration), moveInDate.getDate()) : null;
  const months = parseInt(leaseDuration);
  const totalRent = property ? property.rent * months : 0;
  const totalWithFees = property ? totalRent + property.deposit + 499 : 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p>Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Property Not Found</h2>
          <p className="text-muted-foreground mb-6">The property you're trying to book doesn't exist.</p>
          <Button onClick={() => navigate('/properties')}>Browse Properties</Button>
        </div>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-accent" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
            <p className="text-muted-foreground mb-6">
              Your booking for <strong>{property.title}</strong> has been confirmed.
            </p>
            
            {/* Contact Information Card */}
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-800 flex items-center text-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 mb-3">
                  You can now contact the property owner using the information below:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-blue-900">Owner Name:</span>
                    <span className="ml-2">{property.owner?.name || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-900">Phone:</span>
                    <span className="ml-2">{property.owner?.phone || 'Not provided'}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-blue-900">Email:</span>
                    <span className="ml-2">{property.owner?.email || 'Not available'}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-3 italic">
                  You can also message the owner directly through our chat system
                </p>
              </CardContent>
            </Card>
            <div className="bg-muted rounded-lg p-4 mb-8 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Booking Reference</p>
                <p className="text-2xl font-mono font-bold">RENT{Date.now().toString().slice(-8)}</p>
              </div>
              {moveInDate && (
                <>
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Move-in Date</p>
                    <p className="font-semibold">{formatDate(moveInDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Duration</p>
                    <p className="font-semibold">{leaseDuration} months</p>
                  </div>
                  {leaseEndDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Lease End Date</p>
                      <p className="font-semibold">{formatDate(leaseEndDate)}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={handleChatWithOwner}>
                Message Owner
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="w-32 h-24 rounded-lg overflow-hidden">
                  {property.images && property.images.length > 0 ? (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load for property:', property.title);
                        console.error('Image URL:', property.images[0]);
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
                  <h3 className="font-semibold text-lg mb-1">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.area}, {property.city}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span>{property.bhk} BHK</span>
                    <span>•</span>
                    <span>{property.furnishing}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rental Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="date"
                  value={moveInDate ? moveInDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setMoveInDate(e.target.value ? new Date(e.target.value) : null)}
                  min={property?.availableFrom ? property.availableFrom.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  placeholder="Move-in Date *"
                />
                {errors.moveInDate && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.moveInDate}</span>
                  </div>
                )}
                {availabilityChecking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking property availability...</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={leaseDuration}
                  onChange={(e) => setLeaseDuration(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24].map((months) => (
                    <option key={months} value={months}>
                      {months} month{months !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {moveInDate && leaseEndDate && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Lease End Date</p>
                  <p className="font-semibold">{formatDate(leaseEndDate)}</p>
                </div>
              )}
              
              <Button 
                className="w-full mt-4" 
                onClick={handleDemoBooking}
                disabled={bookingLoading || availabilityChecking}
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Booking...
                  </>
                ) : (
                  `Confirm Booking (${formatCurrency(totalWithFees)})`
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cost Breakdown */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Rent ({months} months)</span>
                <span>{formatCurrency(totalRent)}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Deposit</span>
                <span>{formatCurrency(property?.deposit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>{formatCurrency(499)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>{formatCurrency(totalWithFees)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-4">
                <p className="mb-2">Note: This is a demo booking. No actual payment will be processed.</p>
                <p>All bookings are subject to property owner approval.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateBooking;