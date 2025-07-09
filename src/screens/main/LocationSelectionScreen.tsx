import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';

const { width } = Dimensions.get('window');

const LocationSelectionScreen = ({ route, navigation }) => {

  console.log('API Key:', Config.GOOGLE_PLACES_API_KEY);
  const { packageDetails } = route.params || {};

  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [activeField, setActiveField] = useState('pickup');
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initial region for Tanzania (centered on Dar es Salaam)
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const handleLocationSelect = (data, details, field) => {
    if (!details?.geometry?.location) return;

    const location = {
      id: data.place_id,
      name: data.structured_formatting.main_text,
      address: data.structured_formatting.secondary_text,
      coordinates: {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      },
      details: details, // Full details from Google
    };

    if (field === 'pickup') {
      setPickupLocation(location);
    } else {
      setDropoffLocation(location);
    }

    // Update map region to show the selected location
    setMapRegion({
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
  };

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;

    // Create a new location object
    const newLocation = {
      id: `custom-${Date.now()}`,
      name: activeField === 'pickup' ? 'Pickup Location' : 'Dropoff Location',
      address: `Lat: ${coordinate.latitude.toFixed(4)}, Lng: ${coordinate.longitude.toFixed(4)}`,
      coordinates: coordinate,
    };

    if (activeField === 'pickup') {
      setPickupLocation(newLocation);
    } else {
      setDropoffLocation(newLocation);
    }
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
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onPress={handleMapPress}>
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

      {/* Location Input Panel */}
      <View style={styles.inputPanel}>
        {/* Pickup Location */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pickup Location</Text>
          {Config.GOOGLE_PLACES_API_KEY ? (
            <GooglePlacesAutocomplete
              placeholder="Enter pickup location"
              onPress={(data, details = null) => {
                handleLocationSelect(data, details, 'pickup');
                setActiveField('pickup');
              }}
              query={{
                key: Config.GOOGLE_PLACES_API_KEY,
                language: 'en',
                components: 'country:tz',
              }}
              predefinedPlaces={[]}
              fetchDetails={true}
              onFail={(error) => console.error('Google Places Error:', error)}
              onNotFound={() => console.warn('No results found')}
              styles={{
                textInput: styles.googleInput,
                listView: styles.googleList,
                row: styles.googleRow,
                description: styles.googleDescription,
                poweredContainer: styles.googlePoweredContainer,
              }}
              textInputProps={{
                onFocus: () => setActiveField('pickup'),
                placeholderTextColor: '#999',
              }}
              enablePoweredByContainer={false}
              debounce={300}
              renderLeftButton={() => (
                <View style={styles.inputIcon}>
                  <Ionicons name="locate" size={20} color="#0066cc" />
                </View>
              )}
              renderRightButton={() =>
                pickupLocation && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setPickupLocation(null);
                    }}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )
              }
              suppressDefaultStyles={true}
              listEmptyComponent={() => (
                <View style={{ padding: 10 }}>
                  <Text>No results found</Text>
                </View>
              )}
            />
          ) : (
            <Text style={{ color: 'red' }}>Google Places API key not configured</Text>
          )}
        </View>

        {/* Dropoff Location */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Dropoff Location</Text>
          <GooglePlacesAutocomplete
            placeholder="Enter dropoff location"
            onPress={(data, details = null) => {
              handleLocationSelect(data, details, 'dropoff');
              setActiveField('dropoff');
            }}
            query={{
              key: Config.GOOGLE_PLACES_API_KEY,
              language: 'en',
              components: 'country:tz', // Tanzania only
            }}
            predefinedPlaces={[]}
            fetchDetails={true}
            styles={{
              textInput: styles.googleInput,
              listView: styles.googleList,
              row: styles.googleRow,
              description: styles.googleDescription,
              poweredContainer: styles.googlePoweredContainer,
            }}
            textInputProps={{
              onFocus: () => setActiveField('dropoff'),
              placeholderTextColor: '#999',
            }}
            enablePoweredByContainer={false}
            debounce={300}
            renderLeftButton={() => (
              <View style={styles.inputIcon}>
                <Ionicons name="location" size={20} color="#ff6b6b" />
              </View>
            )}
            renderRightButton={() =>
              dropoffLocation && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setDropoffLocation(null);
                  }}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )
            }
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!pickupLocation || !dropoffLocation) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!pickupLocation || !dropoffLocation}>
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  googleInput: {
    height: 50,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  googleList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 200,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#eee',
    zIndex: 999,
  },
  googleRow: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  googleDescription: {
    fontSize: 14,
    color: '#666',
  },
  googlePoweredContainer: {
    display: 'none',
  },
  inputIcon: {
    position: 'absolute',
    left: 10,
    top: 15,
    zIndex: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 15,
    zIndex: 1,
  },
  continueButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  disabledButton: {
    backgroundColor: '#99ccff',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default LocationSelectionScreen;