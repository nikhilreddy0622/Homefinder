import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, HomeIcon, Shield, TrendingUp, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const Home = () => {
  const [searchCity, setSearchCity] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const navigate = useNavigate();

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsDetectingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use a reverse geocoding service to get city name
          // Using OpenStreetMap Nominatim API as an alternative to BigDataCloud
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data.address) {
            // Try to get city, town, or village from address details
            const city = data.address.city || 
                         data.address.town || 
                         data.address.village || 
                         data.address.county || 
                         'Unknown location';
            setSearchCity(city);
            navigate(`/properties?city=${encodeURIComponent(city)}`);
          } else {
            alert('Could not determine your location. Please enter a city manually.');
          }
        } catch (error) {
          console.error('Error getting location:', error);
          alert('Error getting your location. Please enter a city manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enter a city manually.');
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleSearch = () => {
    if (searchCity.trim()) {
      navigate(`/properties?city=${encodeURIComponent(searchCity)}`);
    } else {
      navigate('/properties');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-hero" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Find Your Perfect Rental Home
          </h1>
          <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Discover thousands of verified properties across India. Your dream home is just a search away.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto bg-background rounded-xl shadow-xl p-2 md:p-3 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Enter city name..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleAutoLocation}
                disabled={isDetectingLocation}
                className="gap-2 rounded-lg flex-1"
                title="Detect my location"
              >
                <Navigation className={`h-5 w-5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isDetectingLocation ? 'Detecting...' : 'Auto'}</span>
                <span className="sm:hidden">{isDetectingLocation ? '...' : 'Auto'}</span>
              </Button>
              <Button 
                variant="default" 
                size="lg"
                onClick={handleSearch}
                className="gap-2 rounded-lg flex-1"
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Homefinder?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We make finding and renting your perfect home simple, secure, and hassle-free.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl bg-card hover:shadow-lg transition-all border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <HomeIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Properties</h3>
              <p className="text-muted-foreground">
                All properties are verified and authenticated by our team for your peace of mind.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-card hover:shadow-lg transition-all border">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-muted-foreground">
                Safe and secure payment gateway for deposits and advance rent payments.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-card hover:shadow-lg transition-all border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Best Deals</h3>
              <p className="text-muted-foreground">
                Get access to the best rental deals and properties at competitive prices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Find Your Dream Home?
          </h2>
          <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
            Join thousands of happy tenants and property owners on Homefinder today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="default" 
              size="lg"
              onClick={() => navigate('/properties')}
              className="rounded-lg w-full sm:w-auto"
            >
              Browse Properties
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="bg-white/10 border-white text-white hover:bg-white hover:text-primary rounded-lg w-full sm:w-auto"
              onClick={() => navigate('/auth?tab=register')}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;