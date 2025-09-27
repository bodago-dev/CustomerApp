import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';

const { width, height } = Dimensions.get('window');

const LocationSelectionScreen = ({ route, navigation }) => {
  const pickupRef = useRef<GooglePlacesAutocomplete>(null);
  const dropoffRef = useRef<GooglePlacesAutocomplete>(null);

  const { packageDetails } = route.params || {};
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [activeField, setActiveField] = useState('pickup');
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  // Initial region for Tanzania (centered on Dar es Salaam)
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    console.log('API Key from Config:', Config.GOOGLE_PLACES_API_KEY);
    setApiReady(!!Config.GOOGLE_PLACES_API_KEY);
  }, []);

  // Function to log Google Places API data
  const logPlaceData = (data: any, details: any, field: string) => {
    console.log('Google Places API Response:', {
      field,
      placeId: data.place_id,
      mainText: data.structured_formatting?.main_text,
      secondaryText: data.structured_formatting?.secondary_text,
      description: data.description,
      types: data.types,
      location: details?.geometry?.location,
      formattedAddress: details?.formatted_address,
      addressComponents: details?.address_components,
    });
  };

  const handleLocationSelect = (data, details, field) => {
    // Log the API response data
    logPlaceData(data, details, field);

    if (!details?.geometry?.location) {
      console.log('No geometry location found in details');
      return;
    }

    const location = {
      id: data.place_id,
      name: data.structured_formatting.main_text,
      address: data.structured_formatting.secondary_text,
      coordinates: {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      },
      details: details,
    };

    if (field === 'pickup') {
      setPickupLocation(location);
    } else {
      setDropoffLocation(location);
    }

    setMapRegion({
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
      latitudeDelta: 0.005, // Closer zoom for selected location
      longitudeDelta: 0.005, // Closer zoom for selected location
    });
  };

  const handleMapPress = async (event) => {
    const { coordinate } = event.nativeEvent;

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${Config.GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();

      console.log('Reverse Geocoding Response:', data);

      if (data.results?.length > 0) {
        const firstResult = data.results[0];
        const newLocation = {
          id: `custom-${Date.now()}`,
          name: firstResult.address_components[0]?.long_name || 'Selected Location',
          address: firstResult.formatted_address,
          coordinates: coordinate,
          details: firstResult,
        };

        if (activeField === 'pickup') {
          setPickupLocation(newLocation);
          pickupRef.current?.setAddressText(newLocation.address);
        } else {
          setDropoffLocation(newLocation);
          dropoffRef.current?.setAddressText(newLocation.address);
        }
      } else {
        const newLocation = {
          id: `custom-${Date.now()}`,
          name: activeField === 'pickup' ? 'Pickup Location' : 'Dropoff Location',
          address: `Lat: ${coordinate.latitude.toFixed(4)}, Lng: ${coordinate.longitude.toFixed(4)}`,
          coordinates: coordinate,
        };

        if (activeField === 'pickup') {
          setPickupLocation(newLocation);
          pickupRef.current?.setAddressText(newLocation.address);
        } else {
          setDropoffLocation(newLocation);
          dropoffRef.current?.setAddressText(newLocation.address);
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      alert('Failed to get address for this location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiError = (error) => {
    console.log('Google Places API Error:', {
      error: JSON.stringify(error, null, 2),
      message: error?.message,
      code: error?.code
    });

    if (error?.message?.includes('argument 7')) {
      console.warn('Google Places API version mismatch detected');
    }
    alert('Location search failed. Please try again.');
  };

  const handleNoResults = () => {
    console.log('Google Places API: No results found for search query');
  };

  const handleApiSuccess = (response) => {
    console.log('Google Places API Success - Response:', response);
  };

  const handleContinue = () => {
    if (!pickupLocation) {
      alert('Please select a pickup location');
      return;
    }
    if (!dropoffLocation) {
      alert('Please select a dropoff location');
      return;
    }
    navigation.navigate('VehicleSelection', {
      packageDetails,
      pickupLocation,
      dropoffLocation,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onPress={handleMapPress}
        onMapReady={() => setMapLoaded(true)}
        mapType="standard"
        userInterfaceStyle="light"
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation.coordinates}
            title={pickupLocation.name}
            description={pickupLocation.address}
            pinColor="#0066cc"
          />
        )}
        {dropoffLocation && (
          <Marker
            coordinate={dropoffLocation.coordinates}
            title={dropoffLocation.name}
            description={dropoffLocation.address}
            pinColor="#ff6b6b"
          />
        )}
      </MapView>

      <View style={styles.inputPanel}>
          <Text style={styles.panelTitle}>Select Locations</Text>
          {/* Pickup Location */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Pickup Location</Text>
            {apiReady ? (
            <ScrollView>
              <GooglePlacesAutocomplete
                key="pickup-autocomplete"
                ref={pickupRef}
                placeholder="Enter pickup location"
                returnKeyType={'search'}
                listViewDisplayed="auto"
                fetchDetails={true}
                onPress={(data, details = null) => {
                  handleLocationSelect(data, details, 'pickup');
                  setActiveField('pickup');
                }}
                query={{
                  key: Config.GOOGLE_PLACES_API_KEY,
                  language: 'en',
                  components: 'country:tz',
                  types: 'geocode',
                  location: `${mapRegion.latitude},${mapRegion.longitude}`,
                  radius: 20000,
                  strictbounds: true,
                }}
                textInputProps={{
                  onFocus: () => setActiveField('pickup'),
                  placeholderTextColor: '#187814',
                  onChangeText: (text) => {
                    console.log('Pickup search text:', text);
                  }
                }}
                styles={{
                  textInputContainer: styles.googleTextInputContainer,
                  textInput: styles.googleInput,
                  listView: styles.listView,
                  row: styles.googleRow,
                  description: styles.googleDescription,
                  separator: styles.separator,
                }}
                enablePoweredByContainer={false}
                debounce={300}
                renderLeftButton={() => (
                  <View style={styles.inputIcon}>
                    <Ionicons name="locate" size={20} color="#0066cc" />
                  </View>
                )}
                renderRightButton={() => (
                  <View style={{ flexDirection: 'row' }}>
                    {isLoading && (
                      <ActivityIndicator
                        size="small"
                        color="#0066cc"
                        style={styles.loadingIndicator}
                      />
                    )}
                    {pickupLocation && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => setPickupLocation(null)}
                      >
                        <Ionicons name="close-circle" size={18} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                onFail={handleApiError}
                onNotFound={handleNoResults}
                suppressDefaultStyles={false}
                currentLocation={false}
                predefinedPlaces={[]}
              />
          </ScrollView>
            ) : (
              <Text style={styles.apiErrorText}>Google Places API not configured</Text>
            )}
          </View>

          {/* Dropoff Location */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Dropoff Location</Text>
            {apiReady ? (
            <ScrollView>
              <GooglePlacesAutocomplete
                key="dropoff-autocomplete"
                ref={dropoffRef}
                placeholder="Enter dropoff location"
                returnKeyType={'search'}
                listViewDisplayed="auto"
                predefinedPlaces={[]}
                fetchDetails={true}
                onPress={(data, details = null) => {
                  handleLocationSelect(data, details, 'dropoff');
                  setActiveField('dropoff');
                }}
                query={{
                  key: Config.GOOGLE_PLACES_API_KEY,
                  language: 'en',
                  components: 'country:tz',
                  types: 'geocode',
                  location: `${mapRegion.latitude},${mapRegion.longitude}`,
                  radius: 20000,
                  strictbounds: true,
                }}
                textInputProps={{
                  onFocus: () => setActiveField('dropoff'),
                  placeholderTextColor: '#a10603',
                  onChangeText: (text) => {
                    console.log('Dropoff search text:', text);
                  }
                }}
                styles={{
                  textInputContainer: styles.googleTextInputContainer,
                  textInput: styles.googleInput,
                  listView: styles.listView,
                  row: styles.googleRow,
                  description: styles.googleDescription,
                  separator: styles.separator,
                }}
                enablePoweredByContainer={false}
                debounce={300}
                renderLeftButton={() => (
                  <View style={styles.inputIcon}>
                    <Ionicons name="location" size={20} color="#ff6b6b" />
                  </View>
                )}
                renderRightButton={() => (
                  <View style={{ flexDirection: 'row' }}>
                    {isLoading && (
                      <ActivityIndicator
                        size="small"
                        color="#ff6b6b"
                        style={styles.loadingIndicator}
                      />
                    )}
                    {dropoffLocation && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => setDropoffLocation(null)}
                      >
                        <Ionicons name="close-circle" size={18} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                onFail={handleApiError}
                onNotFound={handleNoResults}
                suppressDefaultStyles={false}
                currentLocation={false}
              />
          </ScrollView>
            ) : (
              <Text style={styles.apiErrorText}>Google Places API not configured</Text>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!pickupLocation || !dropoffLocation) && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={!pickupLocation || !dropoffLocation}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  map: {
    flex: 1,
  },
  inputPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  googleTextInputContainer: {
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  googleInput: {
    height: 50,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 45,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listView: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: 200,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  googleRow: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  googleDescription: {
    fontSize: 14,
    color: '#444',
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    top: 15,
    zIndex: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
    padding: 5,
  },
  continueButton: {
    backgroundColor: '#0066cc',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 10,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#a0c8f0',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  loadingIndicator: {
    marginRight: 10,
  },
  apiErrorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
});

export default LocationSelectionScreen;