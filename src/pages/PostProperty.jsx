import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Upload, Trash2, Loader2, MapPin, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';
import { createImagePreview, validateImageFile } from '@/utils/imageUtils';

const PostProperty = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Track upload progress
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    deposit: '',
    location: '',
    city: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    furnishing: '',
    availableFrom: new Date().toISOString().split('T')[0] // Default to today
  });
  const [images, setImages] = useState([]); // Images to upload
  const [imagePreviews, setImagePreviews] = useState([]); // Image previews for display
  const [coverImageIndex, setCoverImageIndex] = useState(0); // Index of the cover image
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' }
  ];

  const furnishingOptions = [
    { value: 'furnished', label: 'Furnished' },
    { value: 'semi-furnished', label: 'Semi-Furnished' },
    { value: 'unfurnished', label: 'Unfurnished' }
  ];

  const commonAmenities = [
    'Wi-Fi',
    'Parking',
    'Swimming Pool',
    'Gym',
    'Power Backup',
    'Security',
    'Elevator',
    'Balcony',
    'Garden',
    'Water Heater',
    'AC',
    'Refrigerator',
    'Washing Machine',
    'TV',
    'Microwave',
    'Gas Connection'
  ];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 10 images
    if (imagePreviews.length + files.length > 10) {
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

  const removeImage = (index) => {
    // Remove image from both arrays
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // If the cover image was removed, reset cover to first image
    if (index === coverImageIndex) {
      setCoverImageIndex(0);
    } else if (index < coverImageIndex) {
      // If an image before the cover was removed, adjust cover index
      setCoverImageIndex(prev => prev - 1);
    }
  };

  const setAsCoverImage = (index) => {
    setCoverImageIndex(index);
  };

  const handleAmenityChange = (amenity) => {
    setSelectedAmenities(prev => {
      if (prev.includes(amenity)) {
        return prev.filter(item => item !== amenity);
      } else {
        return [...prev, amenity];
      }
    });
  };

  const handleAddCustomAmenity = () => {
    if (customAmenity.trim() && !selectedAmenities.includes(customAmenity.trim())) {
      setSelectedAmenities(prev => [...prev, customAmenity.trim()]);
      setCustomAmenity('');
    }
  };

  const removeAmenity = (amenity) => {
    setSelectedAmenities(prev => prev.filter(item => item !== amenity));
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setDetectingLocation(true);
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const response = await api.post('/utils/geocode/reverse', {
              lat: latitude,
              lon: longitude
            });
            
            if (response.data.success) {
              const address = response.data.address;
              
              // Improved address extraction for better accuracy
              const location = address.street && address.street.trim() !== '' 
                ? address.street 
                : address.full || 'Unknown location';
              
              const city = address.city && address.city.trim() !== '' 
                ? address.city 
                : address.state || 'Unknown city';
              
              setFormData(prev => ({
                ...prev,
                location: location,
                city: city
              }));
              toast.success('Location detected successfully!');
            } else {
              toast.error('Failed to detect location. Please enter manually.');
            }
          } catch (error) {
            console.error('Error detecting location:', error);
            toast.error('Failed to detect location. Please enter manually.');
          } finally {
            setDetectingLocation(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Failed to get your location. Please enter manually.');
          setDetectingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } catch (error) {
      console.error('Error detecting location:', error);
      toast.error('Failed to detect location. Please enter manually.');
      setDetectingLocation(false);
    }
  };

  const uploadImageToCloudinary = async (imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', 'first_time_upload'); // Your upload preset
    
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/dz7mjfzaw/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error('Failed to upload image to Cloudinary');
      }
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields including deposit
    if (selectedAmenities.length === 0) {
      toast.error('Please select at least one amenity');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    // Enhanced validation that properly checks for empty/whitespace values
    const requiredFields = [
      'title', 'description', 'price', 'deposit', 'location', 
      'city', 'propertyType', 'bedrooms', 'bathrooms', 'area', 
      'furnishing', 'availableFrom'
    ];
    
    const emptyFields = requiredFields.filter(field => {
      const value = formData[field];
      // Check for undefined, null, or empty/whitespace strings
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim() === '');
    });
    
    if (emptyFields.length > 0) {
      toast.error('Please fill in all required fields');
      console.log('Empty fields:', emptyFields);
      return;
    }

    // Validate numeric fields are actually numbers and positive
    const numericFields = ['price', 'deposit', 'bedrooms', 'bathrooms', 'area'];
    const invalidNumbers = numericFields.filter(field => {
      const numValue = Number(formData[field]);
      return isNaN(numValue) || numValue <= 0;
    });
    
    if (invalidNumbers.length > 0) {
      toast.error('Please enter valid positive numbers for price, deposit, bedrooms, bathrooms, and area');
      return;
    }

    // Validate select fields have valid values
    const propertyTypes = ['apartment', 'house', 'villa', 'studio', 'condo', 'townhouse'];
    const furnishingOptions = ['furnished', 'semi-furnished', 'unfurnished'];
    
    if (!propertyTypes.includes(formData.propertyType)) {
      toast.error('Please select a valid property type');
      return;
    }
    
    if (!furnishingOptions.includes(formData.furnishing)) {
      toast.error('Please select a valid furnishing option');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      // Upload all images to Cloudinary first
      let uploadedImageUrls = [];
      
      if (images.length > 0) {
        try {
          // Upload all images to Cloudinary
          const uploadPromises = images.map(image => uploadImageToCloudinary(image));
          uploadedImageUrls = await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Error uploading images to Cloudinary:', uploadError);
          toast.error('Error uploading images. Please try again.');
          setLoading(false);
          setUploadProgress(0);
          return;
        }
      }
      
      // Reorder images to make the selected cover image the first one
      if (uploadedImageUrls.length > 1 && coverImageIndex < uploadedImageUrls.length) {
        // Move the selected cover image to the first position
        const coverImage = uploadedImageUrls[coverImageIndex];
        const remainingImages = uploadedImageUrls.filter((_, index) => index !== coverImageIndex);
        uploadedImageUrls = [coverImage, ...remainingImages];
      }
      
      // Prepare property data for submission with proper type conversion
      const propertyData = {
        ...formData,
        price: Number(formData.price),
        deposit: Number(formData.deposit),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        area: Number(formData.area),
        amenities: selectedAmenities,
        images: uploadedImageUrls
      };

      // Submit to API
      const response = await api.post('/properties', propertyData);
      
      toast.success('Property posted successfully!');
      // Redirect to browse properties instead of property details page
      navigate('/browse-properties');
    } catch (error) {
      console.error('Error posting property:', error);
      toast.error(error.response?.data?.message || 'Failed to post property. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Post a New Property</CardTitle>
            <CardDescription>
              Fill in the details below to list your property for rent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Property Title *"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="Monthly Rent (₹) *"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    id="deposit"
                    name="deposit"
                    type="number"
                    value={formData.deposit}
                    onChange={handleChange}
                    placeholder="Security Deposit (₹) *"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Select 
                    value={formData.propertyType} 
                    onValueChange={(value) => handleSelectChange('propertyType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Property Type *" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Select 
                    value={formData.bedrooms} 
                    onValueChange={(value) => handleSelectChange('bedrooms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Number of Bedrooms *" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Bedroom' : 'Bedrooms'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Select 
                    value={formData.bathrooms} 
                    onValueChange={(value) => handleSelectChange('bathrooms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Number of Bathrooms *" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Bathroom' : 'Bathrooms'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Select 
                    value={formData.furnishing} 
                    onValueChange={(value) => handleSelectChange('furnishing', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Furnishing *" />
                    </SelectTrigger>
                    <SelectContent>
                      {furnishingOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Input
                    id="area"
                    name="area"
                    type="number"
                    min="1"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="Area (sq ft) *"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    id="availableFrom"
                    name="availableFrom"
                    type="date"
                    value={formData.availableFrom}
                    onChange={handleChange}
                    placeholder="Available From *"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex gap-2">
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Location *"
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={detectLocation}
                      disabled={detectingLocation}
                      className="flex items-center gap-2"
                    >
                      {detectingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      Detect
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City *"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Property Description *"
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Images Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Property Images</h3>
                <div className="mb-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    You can upload up to 10 images. First image will be used as the cover photo.
                  </p>
                </div>
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => {
                      const isCover = index === coverImageIndex;
                      return (
                        <div key={index} className="relative">
                          <div className={`aspect-square rounded-lg overflow-hidden border-2 ${isCover ? 'border-blue-500' : 'border-gray-200'}`}>
                            <img 
                              src={preview} 
                              alt={`Property ${index + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => removeImage(index)}
                            disabled={loading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {imagePreviews.length > 1 && (
                            <Button
                              type="button"
                              variant={isCover ? "default" : "outline"}
                              size="sm"
                              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 rounded-full"
                              onClick={() => setAsCoverImage(index)}
                              disabled={loading}
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

              {/* Amenities Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {commonAmenities.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity}`}
                        checked={selectedAmenities.includes(amenity)}
                        onCheckedChange={() => handleAmenityChange(amenity)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={`amenity-${amenity}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    placeholder="Add custom amenity"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    disabled={loading}
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddCustomAmenity}
                    variant="outline"
                    disabled={loading}
                  >
                    Add
                  </Button>
                </div>
                
                {selectedAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAmenities.map((amenity, index) => (
                      <div 
                        key={index} 
                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {amenity}
                        <button 
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="text-secondary-foreground hover:text-destructive"
                          disabled={loading}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress bar when uploading */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading property...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || selectedAmenities.length === 0 || images.length === 0}
                  className="flex items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Posting...' : 'Post Property'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostProperty;
