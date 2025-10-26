import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter, X, Trash2, IndianRupee, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/helpers';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getImageDisplayClass } from '@/utils/imageUtils';
import PropertyCard from '@/components/property/PropertyCard';

const BrowseProperties = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    propertyType: '',
    bedrooms: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Parse query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const city = params.get('city') || '';
    setSearchTerm(city);
    setFilters(prev => ({ ...prev, city }));
  }, [location.search]);

  // Fetch properties
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      // Use the new endpoint that includes availability information
      const response = await api.get('/properties/with-availability');
      setProperties(response.data.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
      // Fallback to regular properties endpoint if the new one fails
      try {
        const fallbackResponse = await api.get('/properties');
        setProperties(fallbackResponse.data.data);
      } catch (fallbackError) {
        console.error('Error fetching fallback properties:', fallbackError);
        toast.error('Failed to load properties');
        // Removed mock data - show empty array instead
        setProperties([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // In a real app, this would trigger an API call with search parameters
    console.log('Searching for:', searchTerm, filters);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      minPrice: '',
      maxPrice: '',
      propertyType: '',
      bedrooms: ''
    });
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    
    try {
      await api.delete(`/properties/${propertyId}`);
      toast.success('Property deleted successfully');
      // Refresh the properties list
      fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = !filters.city || property.city.toLowerCase().includes(filters.city.toLowerCase());
    const matchesMinPrice = !filters.minPrice || property.price >= parseInt(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || property.price <= parseInt(filters.maxPrice);
    const matchesPropertyType = !filters.propertyType || property.propertyType.toLowerCase() === filters.propertyType.toLowerCase();
    const matchesBedrooms = !filters.bedrooms || property.bedrooms.toString() === filters.bedrooms;
    
    return matchesSearch && matchesCity && matchesMinPrice && matchesMaxPrice && matchesPropertyType && matchesBedrooms;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Properties</h1>
        <p className="text-muted-foreground">Find your perfect rental home</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by location, property name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 flex-1"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <Button onClick={handleSearch} className="flex-1">Search</Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">City</label>
                  <Input
                    placeholder="City"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Price</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Min Price"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Price</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Max Price"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Property Type</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="villa">Villa</option>
                    <option value="studio">Studio</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Bedrooms</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filters.bedrooms}
                    onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4+ BHK</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Properties List */}
      {loading ? (
        <div className="text-center py-12">
          <p>Loading properties...</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-muted-foreground">
              Showing {filteredProperties.length} of {properties.length} properties
            </p>
          </div>
          
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No properties found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property._id}
                  property={property}
                  showDelete={user && property.owner && (property.owner._id === user.id || property.owner === user.id)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrowseProperties;