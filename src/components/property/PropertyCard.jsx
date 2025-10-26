import { useNavigate } from 'react-router-dom';
import { MapPin, Eye, Edit, Calendar, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';

const PropertyCard = ({ 
  property, 
  showActions = true, 
  showDelete = false, 
  onDelete,
  deletingId,
  getStatusVariant,
  getStatusText
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if current user is the owner of the property
  // Handle different possible ID formats
  const ownerId = property?.owner?._id || property?.owner;
  const userId = user?._id || user?.id;
  
  const isOwner = user && ownerId && userId && (
    ownerId.toString() === userId.toString()
  );

  const handleDelete = () => {
    if (onDelete && property?._id) {
      onDelete(property._id);
    }
  };

  // Ensure property data exists
  if (!property) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">Property data not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`overflow-hidden hover:shadow-lg transition-all ${property?.isBooked ? 'border-destructive' : ''}`}
    >
      <div className="relative h-48 overflow-hidden">
        {property?.images && property.images.length > 0 ? (
          <img 
            src={property.images[0]} 
            alt={property.title || 'Property image'}
            className="w-full h-full object-contain"
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
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
        
        <Badge 
          className="absolute top-3 right-3" 
          variant={getStatusVariant ? getStatusVariant(property?.status, property?.isBooked) : 'default'}
        >
          {getStatusText ? getStatusText(property?.status, property?.isBooked) : (property?.status || 'Available')}
        </Badge>
        
        {/* Show "Already Booked" indicator */}
        {property?.isBooked && (
          <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Booked
          </div>
        )}
        
        {/* Show rating if available - moved to bottom left to avoid overlap */}
        {property?.averageRating > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{property.averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-semibold text-lg line-clamp-1 ${property?.isBooked ? 'text-destructive' : ''}`}>
            {property?.title || 'Untitled Property'}
          </h3>
          <div className={`font-bold ${property?.isBooked ? 'text-destructive' : 'text-primary'}`}>
            {formatCurrency(property?.price)}<span className="text-sm font-normal">/month</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">
            {(property?.location || 'Location not specified') + ', ' + (property?.city || 'City not specified')}
          </span>
        </div>

        {property?.bedrooms && property?.bathrooms && property?.area && (
          <div className="flex items-center gap-4 text-sm mb-3">
            <span>{property.bedrooms} Beds</span>
            <span>{property.bathrooms} Baths</span>
            <span>{property.area} sqft</span>
          </div>
        )}

        {property?.amenities && Array.isArray(property.amenities) && property.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {property.amenities.slice(0, 3).map((amenity, index) => (
              <Badge key={index} variant="secondary">
                {amenity}
              </Badge>
            ))}
            {property.amenities.length > 3 && (
              <Badge variant="secondary">
                +{property.amenities.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        {showActions && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/property/${property?._id}`)}
              className="flex-1"
              disabled={!property?._id}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            {isOwner && (
              <Button 
                size="sm"
                onClick={() => navigate(`/edit-property/${property?._id}`)}
                className="flex-1"
                disabled={!property?._id}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {showDelete && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deletingId === property?._id || !property?._id}
                className="flex-1"
              >
                {deletingId === property?._id ? (
                  <span className="h-4 w-4">...</span>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyCard;