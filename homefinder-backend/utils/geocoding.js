const axios = require('axios');

// Reverse geocoding using OpenStreetMap Nominatim API (free)
const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
        zoom: 18
      },
      headers: {
        'User-Agent': 'Homefinder-App/1.0'
      }
    });

    if (response.data && response.data.display_name) {
      const address = response.data;
      return {
        success: true,
        address: {
          full: address.display_name,
          street: address.address?.house_number ? 
            `${address.address.house_number} ${address.address.road}` : 
            address.address?.road || '',
          city: address.address?.city || address.address?.town || address.address?.village || '',
          state: address.address?.state || '',
          country: address.address?.country || '',
          postalCode: address.address?.postcode || '',
          coordinates: {
            lat: parseFloat(latitude),
            lng: parseFloat(longitude)
          }
        }
      };
    } else {
      return {
        success: false,
        error: 'No address found for the given coordinates'
      };
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: 'Failed to get address information'
    };
  }
};

// Forward geocoding - convert address to coordinates
const forwardGeocode = async (address) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        addressdetails: 1,
        limit: 1
      },
      headers: {
        'User-Agent': 'Homefinder-App/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        success: true,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        address: {
          full: result.display_name,
          street: result.address?.house_number ? 
            `${result.address.house_number} ${result.address.road}` : 
            result.address?.road || '',
          city: result.address?.city || result.address?.town || result.address?.village || '',
          state: result.address?.state || '',
          country: result.address?.country || '',
          postalCode: result.address?.postcode || ''
        }
      };
    } else {
      return {
        success: false,
        error: 'No coordinates found for the given address'
      };
    }
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return {
      success: false,
      error: 'Failed to get coordinates for the address'
    };
  }
};

module.exports = {
  reverseGeocode,
  forwardGeocode
};
