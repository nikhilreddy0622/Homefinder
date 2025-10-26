import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Bed, Bath, Square, IndianRupee, Calendar, Trash2, Upload, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { formatCurrency } from '@/utils/helpers';
import { createImagePreview, validateImageFile } from '@/utils/imageUtils';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    city: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    furnishing: ''
  });
  const [images, setImages] = useState([]); // New images to upload
  const [imagePreviews, setImagePreviews] = useState([]); // Previews for new images
  const [existingImages, setExistingImages] = useState([]); // Existing images from the property
  const [coverImageIndex, setCoverImageIndex] = useState(0); // Index of the cover image
  const [amenities, setAmenities] = useState([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Common amenities for checkbox selection
  const commonAmenities = [
    'Parking', 'Gym', 'Swimming Pool', 'WiFi', 'Air Conditioning', 
    'Heating', 'Laundry', 'Kitchen', 'Balcony', 'Garden', 
    'Security', 'Elevator', 'Pet Friendly', 'Furnished', 
    'Utilities Included', 'Near Public Transport'
  ];

  // Fetch property details
  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      console.log('Fetching property with ID:', id);
      const response = await api.get(`/properties/${id}`);
      console.log('Property API response:', response);
      const property = response.data.data;
      console.log('Property data:', property);
      
      // Check if current user is the owner
      const ownerId = property.owner?._id || property.owner;
      console.log('Property owner ID:', ownerId);
      console.log('Current user:', user);
      
      // Ensure proper comparison of user IDs (handle different ID formats)
      const currentUserIsOwner = user && (
        user.id === ownerId || 
        user._id === ownerId || 
        user.id === ownerId?.toString() || 
        user._id === ownerId?.toString()
      );
      console.log('Owner check - Current user ID:', user?.id, 'User _id:', user?._id, 'Property owner:', ownerId, 'Is owner:', currentUserIsOwner);
      
      if (!currentUserIsOwner) {
        toast.error("You don't have permission to edit this property");
        navigate('/my-properties');
        return;
      }
      
      setIsOwner(true);
      
      // Log the property data before setting form state
      console.log('Setting form data with property:', property);
      
      // Ensure all values are properly converted to strings with fallbacks
      setFormData({
        title: property.title != null ? String(property.title) : '',
        description: property.description != null ? String(property.description) : '',
        price: property.price != null ? String(property.price) : '',
        location: property.location != null ? String(property.location) : '',
        city: property.city != null ? String(property.city) : '',
        propertyType: property.propertyType != null ? String(property.propertyType) : '',
        bedrooms: property.bedrooms != null ? String(property.bedrooms) : '',
        bathrooms: property.bathrooms != null ? String(property.bathrooms) : '',
        area: property.area != null ? String(property.area) : '',
        furnishing: property.furnishing != null ? String(property.furnishing) : ''
      });
      
      console.log('Form data set to:', {
        title: property.title != null ? String(property.title) : '',
        description: property.description != null ? String(property.description) : '',
        price: property.price != null ? String(property.price) : '',
        location: property.location != null ? String(property.location) : '',
        city: property.city != null ? String(property.city) : '',
        propertyType: property.propertyType != null ? String(property.propertyType) : '',
        bedrooms: property.bedrooms != null ? String(property.bedrooms) : '',
        bathrooms: property.bathrooms != null ? String(property.bathrooms) : '',
        area: property.area != null ? String(property.area) : '',
        furnishing: property.furnishing != null ? String(property.furnishing) : ''
      });
      
      // Set existing images
      if (property.images && Array.isArray(property.images)) {
        setExistingImages(property.images);
      }
      
      // Set existing amenities
      if (property.amenities && Array.isArray(property.amenities)) {
        setAmenities(property.amenities);
      }
    } catch (error) {
      console.error('Error fetching property:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      toast.error('Error fetching property details. Please try again.');
      navigate('/my-properties');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 10 images total (existing + new)
    const totalImages = existingImages.length + imagePreviews.length + files.length;
    if (totalImages > 10) {
      toast.error('You can upload maximum 10 images');
      return;
    }
    
    // Validate each file
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.message);
        return;
      }
    }
    
    // Create previews for all files
    const previews = [];
    for (const file of files) {
      const preview = await createImagePreview(file);
      previews.push(preview);
    }
    
    // Add new images and previews to state
    setImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeExistingImage = (index) => {
    // Mark existing image for removal
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    
    // If the cover image was removed, reset cover to first image
    if (index === coverImageIndex) {
      setCoverImageIndex(0);
    } else if (index < coverImageIndex) {
      // If an image before the cover was removed, adjust cover index
      setCoverImageIndex(prev => prev - 1);
    }
  };

  const removeNewImage = (index) => {
    // Remove new image from both arrays
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Adjust cover index if needed
    const totalExistingImages = existingImages.length;
    const removedImageIndex = totalExistingImages + index;
    
    if (removedImageIndex === coverImageIndex) {
      setCoverImageIndex(0);
    } else if (removedImageIndex < coverImageIndex) {
      setCoverImageIndex(prev => prev - 1);
    }
  };

  const setAsCoverImage = (index) => {
    setCoverImageIndex(index);
  };

  const toggleAmenity = (amenity) => {
    setAmenities(prev => {
      if (prev.includes(amenity)) {
        return prev.filter(a => a !== amenity);
      } else {
        return [...prev, amenity];
      }
    });
  };

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    setIsDetectingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use OpenStreetMap Nominatim API for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data.address) {
            // Extract city and location details
            const city = data.address.city || 
                         data.address.town || 
                         data.address.village || 
                         data.address.county || 
                         'Unknown location';
            
            const location = data.address.neighbourhood || 
                            data.address.suburb || 
                            data.address.road || 
                            '';
            
            setFormData(prev => ({
              ...prev,
              city,
              location
            }));
          } else {
            toast.error('Could not determine your location. Please enter manually.');
          }
        } catch (error) {
          console.error('Error getting location:', error);
          toast.error('Error getting your location. Please enter manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Could not get your location. Please enter manually.');
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Prepare form data for submission
      const propertyData = new FormData();
      
      // Append text fields with proper data types
      Object.keys(formData).forEach(key => {
        if (key === 'price' || key === 'bedrooms' || key === 'bathrooms' || key === 'area') {
          // Convert numeric fields to numbers
          const value = formData[key];
          if (value !== '') {
            propertyData.append(key, Number(value));
          }
        } else {
          // Append other fields as strings
          propertyData.append(key, formData[key]);
        }
      });
      
      // Append amenities (required field)
      if (amenities.length > 0) {
        amenities.forEach(amenity => {
          propertyData.append('amenities', amenity);
        });
      } else {
        // Add a default amenity if none selected
        propertyData.append('amenities', 'Basic');
      }
      
      // Create a combined array of all images in the correct order
      const allImages = [...existingImages, ...imagePreviews];
      
      // If we have images and more than one, ensure the cover image is first
      if (allImages.length > 1) {
        // Reorder images so the cover image is first
        const reorderedImages = [...allImages];
        const coverImage = reorderedImages[coverImageIndex];
        reorderedImages.splice(coverImageIndex, 1);
        reorderedImages.unshift(coverImage);
        
        // For existing images, we need to send them in the correct order
        // For new images, they will be appended in the correct order
        const existingImagesInOrder = [];
        const newImagesInOrder = [];
        const newImageFiles = [];
        
        reorderedImages.forEach((image, index) => {
          // Check if this is an existing image (URL) or new image (preview)
          if (existingImages.includes(image)) {
            existingImagesInOrder.push(image);
          } else {
            // Find the corresponding file for this preview
            const previewIndex = imagePreviews.indexOf(image);
            if (previewIndex !== -1 && previewIndex < images.length) {
              newImagesInOrder.push(image);
              newImageFiles.push(images[previewIndex]);
            }
          }
        });
        
        // Append existing images in the correct order
        existingImagesInOrder.forEach(image => {
          propertyData.append('existingImages', image);
        });
        
        // Append new images in the correct order
        newImageFiles.forEach(image => {
          propertyData.append('images', image);
        });
      } else {
        // Append new images
        images.forEach(image => {
          propertyData.append('images', image);
        });
        
        // If existing images were not removed, we need to indicate this
        // We'll send the current existing images list
        if (existingImages.length > 0) {
          existingImages.forEach(image => {
            propertyData.append('existingImages', image);
          });
        }
      }
      
      // Submit to API
      const response = await api.put(`/properties/${id}`, propertyData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Property updated successfully!');
      navigate('/my-properties');
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error('Error updating property. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/properties/${id}`);
      toast.success('Property deleted successfully!');
      navigate('/my-properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Error deleting property. Please try again.');
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

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You don't have permission to edit this property.</p>
          <Button onClick={() => navigate('/my-properties')}>Go to My Properties</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/my-properties')}>
          ← Back to My Properties
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Property</CardTitle>
          <CardDescription>
            Update details about your property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Property Title</label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter property title"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Price (₹ per month)</label>
                  <Input
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Enter monthly rent"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your property in detail..."
                    rows={4}
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Location */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Location</label>
                  <div className="relative">
                    <Input
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Enter location"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2"
                      onClick={handleAutoLocation}
                      disabled={isDetectingLocation}
                      title="Detect my location"
                    >
                      <MapPin className={`h-4 w-4 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">City</label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Property Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Property Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Property Type</label>
                  <Select
                    value={formData.propertyType}
                    onValueChange={(value) => handleInputChange({ target: { name: 'propertyType', value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Bedrooms</label>
                  <Select
                    value={formData.bedrooms}
                    onValueChange={(value) => handleInputChange({ target: { name: 'bedrooms', value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bedrooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 BHK</SelectItem>
                      <SelectItem value="2">2 BHK</SelectItem>
                      <SelectItem value="3">3 BHK</SelectItem>
                      <SelectItem value="4">4+ BHK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Bathrooms</label>
                  <Select
                    value={formData.bathrooms}
                    onValueChange={(value) => handleInputChange({ target: { name: 'bathrooms', value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bathrooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Bathroom</SelectItem>
                      <SelectItem value="2">2 Bathrooms</SelectItem>
                      <SelectItem value="3">3 Bathrooms</SelectItem>
                      <SelectItem value="4">4+ Bathrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Area (sq ft)</label>
                  <Input
                    name="area"
                    type="number"
                    value={formData.area}
                    onChange={handleInputChange}
                    placeholder="Enter area in sq ft"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Furnishing</label>
                  <Select
                    value={formData.furnishing}
                    onValueChange={(value) => handleInputChange({ target: { name: 'furnishing', value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select furnishing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furnished">Furnished</SelectItem>
                      <SelectItem value="semi-furnished">Semi-Furnished</SelectItem>
                      <SelectItem value="unfurnished">Unfurnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Images */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Property Images</h3>
              <div className="mb-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload Images
                </Button>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  You can upload up to 10 images. First image will be used as the cover photo.
                </p>
              </div>
              
              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {/* Existing Images */}
                  {existingImages.map((image, index) => {
                    const globalIndex = index;
                    const isCover = globalIndex === coverImageIndex;
                    return (
                      <div key={`existing-${index}`} className="relative">
                        <div className={`aspect-square rounded-lg overflow-hidden border-2 ${isCover ? 'border-blue-500' : 'border-gray-200'}`}>
                          <img 
                            src={image} 
                            alt={`Property ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={() => removeExistingImage(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {existingImages.length + imagePreviews.length > 1 && (
                          <Button
                            type="button"
                            variant={isCover ? "default" : "outline"}
                            size="sm"
                            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 rounded-full"
                            onClick={() => setAsCoverImage(globalIndex)}
                            title={isCover ? "Cover image" : "Set as cover image"}
                          >
                            {isCover ? (
                              <Star className="h-3 w-3 fill-current" />
                            ) : (
                              <Star className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* New Images */}
                  {imagePreviews.map((preview, index) => {
                    const globalIndex = existingImages.length + index;
                    const isCover = globalIndex === coverImageIndex;
                    return (
                      <div key={`new-${index}`} className="relative">
                        <div className={`aspect-square rounded-lg overflow-hidden border-2 ${isCover ? 'border-blue-500' : 'border-gray-200'}`}>
                          <img 
                            src={preview} 
                            alt={`New Property ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={() => removeNewImage(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {existingImages.length + imagePreviews.length > 1 && (
                          <Button
                            type="button"
                            variant={isCover ? "default" : "outline"}
                            size="sm"
                            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 rounded-full"
                            onClick={() => setAsCoverImage(globalIndex)}
                            title={isCover ? "Cover image" : "Set as cover image"}
                          >
                            {isCover ? (
                              <Star className="h-3 w-3 fill-current" />
                            ) : (
                              <Star className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Amenities */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                {commonAmenities.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <Checkbox
                      id={`amenity-${index}`}
                      checked={amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <label htmlFor={`amenity-${index}`} className="ml-2 text-sm">
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
              >
                Delete Property
              </Button>
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/my-properties')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Property'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProperty;