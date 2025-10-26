import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Bed, Bath, Square, Calendar, Phone, Mail, Heart, ArrowLeft, Trash2, MessageCircle, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/services/api';
import { getPropertyStatus } from '@/utils/propertyUtils';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch real property data from API
  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/properties/${id}`);
      setProperty(response.data.data);
      
      // Check property availability status
      const status = getPropertyStatus(response.data.data);
      setAvailabilityStatus(status);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/properties/${id}`);
      toast.success('Property deleted successfully!');
      navigate('/properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    } finally {
      setDeleting(false);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      toast.info('Please log in to book this property');
      navigate('/auth');
      return;
    }
    
    // Navigate to booking creation page
    navigate(`/properties/${id}/book`);
  };

  const handleMessageOwner = async () => {
    if (!isAuthenticated) {
      toast.info('Please log in to message the owner');
      navigate('/auth');
      return;
    }
    
    // Check if property exists and has owner information
    if (!property || !property._id) {
      toast.error('Property information not available');
      return;
    }
    
    // Check if property owner exists
    if (!property.owner) {
      toast.error('Property owner information not available');
      return;
    }
    
    try {
      // Get the owner ID properly
      const ownerId = property.owner._id || property.owner;
      
      // Validate that we have an owner ID
      if (!ownerId) {
        toast.error('Unable to identify property owner');
        return;
      }
      
      // Make sure we're not trying to message ourselves
      if (user && (user.id === ownerId || user._id === ownerId)) {
        toast.error('You cannot message yourself');
        return;
      }
      
      // Create or get existing chat with the property owner
      const response = await api.post('/chats', {
        recipientId: ownerId,
        propertyId: property._id
      });
      
      // Navigate to the chat page with the conversation
      navigate('/chat');
      toast.success('Chat opened with property owner');
    } catch (error) {
      console.error('Error initiating chat:', error);
      const errorMessage = error.response?.data?.message || 'Failed to initiate chat with owner';
      toast.error(errorMessage);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // In a real app, this would update the user's favorites
  };

  const nextImage = () => {
    if (property && property.images && Array.isArray(property.images) && property.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === property.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevImage = () => {
    if (property && property.images && Array.isArray(property.images) && property.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? property.images.length - 1 : prevIndex - 1
      );
    }
  };

  const goToImage = (index) => {
    if (property && property.images && Array.isArray(property.images) && property.images.length > 0) {
      setCurrentImageIndex(index);
    }
  };

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
          <p className="text-muted-foreground mb-6">The property you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/properties')}>Browse Properties</Button>
        </div>
      </div>
    );
  }

  const isOwner = user && property && property.owner && (property.owner._id === user.id || property.owner === user.id);
  const hasImages = property && property.images && Array.isArray(property.images) && property.images.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/properties')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Button>
        
        {/* Delete button for property owners */}
        {isOwner && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Property
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Images and Details */}
        <div className="lg:col-span-2">
          {/* Image Gallery with Carousel */}
          <div className="mb-6">
            <div className="relative h-96 rounded-xl overflow-hidden mb-4">
              {hasImages ? (
                <>
                  <img 
                    src={property.images[currentImageIndex]} 
                    alt={`${property.title} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error('Image failed to load for property:', property.title);
                      console.error('Image URL:', property.images[currentImageIndex]);
                      console.error('Error:', e);
                      // Set a fallback image
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJyZ2JhKDIwMCwgMjAwLCAyMDAsIDAuMikiLz4KPHBhdGggZD0iTTEyLjAwMDIgMTUuMzg0NkMxMy42NzAxIDE1LjM4NDYgMTUuMDAwMiAxNC4wNTQ1IDE1LjAwMDIgMTIuMzg0NkMxNS4wMDAyIDEwLjcxNDcgMTMuNjcwMSA5LjM4NDU4IDEyLjAwMDIgOS4zODQ1OEMxMC4zMzAzIDkuMzg0NTggOS4wMDAyNCAxMC43MTQ3IDkuMDAwMjQgMTIuMzg0NkM5LjAwMDI0IDE0LjA1NDUgMTAuMzMwMyAxNS4zODQ2IDEyLjAwMDIgMTUuMzg0NloiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTEyLjAwMDIgMTUuMzg0NkMxMy42NzAxIDE1LjM4NDYgMTUuMDAwMiAxNC4wNTQ1IDE1LjAwMDIgMTIuMzg0NkMxNS4wMDAyIDEwLjcxNDcgMTMuNjcwMSA5LjM4NDU4IDEyLjAwMDIgOS4zODQ1OEMxMC4zMzAzIDkuMzg0NTggOS4wMDAyNCAxMC43MTQ3IDkuMDAwMjQgMTIuMzg0NkM5LjAwMDI0IDE0LjA1NDUgMTAuMzMwMyAxNS4zODQ2IDEyLjAwMDIgMTUuMzg0NloiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                    }}
                  />
                  {/* Navigation Arrows */}
                  {property.images && Array.isArray(property.images) && property.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                        {property.images && Array.isArray(property.images) && property.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => goToImage(index)}
                            className={`w-3 h-3 rounded-full ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                            aria-label={`Go to image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No image available</span>
                </div>
              )}
              {/* Availability badge */}
              {availabilityStatus && (
                <Badge 
                  className="absolute top-4 right-4"
                  variant={availabilityStatus.variant}
                >
                  {availabilityStatus.text}
                </Badge>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-card rounded-xl p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  <span>{property.location}, {property.city}</span>
                </div>
                {property.averageRating > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${i < property.averageRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-medium">{property.averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({property.numberOfReviews} reviews)</span>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleFavorite}
                className={isFavorite ? 'text-destructive' : ''}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-muted-foreground" />
                <span>{property.bedrooms} Bedrooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-muted-foreground" />
                <span>{property.bathrooms} Bathrooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Square className="h-5 w-5 text-muted-foreground" />
                <span>{property.area} sqft</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span>Posted {new Date(property.createdAt).toLocaleDateString()}</span>
              </div>
              {property.availableFrom && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>Available from {new Date(property.availableFrom).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <p className="text-muted-foreground">{property.description}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {property.amenities && Array.isArray(property.amenities) ? (
                  property.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary">
                      {amenity}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No amenities listed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Booking Panel */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl p-6 sticky top-8">
            <div className="mb-6">
              <div className="text-3xl font-bold mb-2">{formatCurrency(property.price)}</div>
              <div className="text-muted-foreground">per month</div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Badge>{property.propertyType}</Badge>
              <Badge>{property.furnishing}</Badge>
              {/* Show availability status badge */}
              {availabilityStatus && (
                <Badge variant={availabilityStatus.variant}>
                  {availabilityStatus.text}
                </Badge>
              )}
              {property.averageRating > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {property.averageRating.toFixed(1)}
                </Badge>
              )}
            </div>

            <Button 
              className="w-full mb-4"
              size="lg"
              onClick={handleBookNow}
              disabled={availabilityStatus && !availabilityStatus.isAvailable}
            >
              {availabilityStatus && !availabilityStatus.isAvailable ? 'Not Available' : 'Book Now'}
            </Button>

            <Button 
              variant="outline"
              className="w-full mb-4 flex items-center gap-2"
              onClick={handleMessageOwner}
            >
              <MessageCircle className="h-4 w-4" />
              Message Owner
            </Button>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Contact Owner</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {property.owner?.name?.charAt(0) || 'O'}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{property.owner?.name || 'Property Owner'}</div>
                  <div className="text-sm text-muted-foreground">Property Owner</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button variant="outline" className="w-full flex items-center gap-2" onClick={() => {
                  window.location.href = `tel:${property.owner?.phone || '#'}`;
                }}>
                  <Phone className="h-4 w-4" />
                  {property.owner?.phone || 'Phone not available'}
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2" onClick={() => {
                  window.location.href = `mailto:${property.owner?.email || '#'}`;
                }}>
                  <Mail className="h-4 w-4" />
                  {property.owner?.email || 'Email not available'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;