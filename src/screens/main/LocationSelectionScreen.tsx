import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import locationService from '../../services/LocationService';
import firestoreService from '../../services/FirestoreService';

const { width } = Dimensions.get('window');

const LocationSelectionScreen = ({ route, navigation }) => {
  const { packageDetails } = route.params || {};
  
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropoffSearch, setDropoffSearch] = useState('');
  const [activeField, setActiveField] = useState('pickup');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  // Initial region for Tanzania (centered on Dar es Salaam)
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Mock search results - in a real app, this would come from Google Places API
  const mockSearchLocations = [
    { id: '1', name: 'Mlimani City Mall', address: 'Sam Nujoma Rd, Dar es Salaam', coordinates: { latitude: -6.7724, longitude: 39.2383 } },
    { id: '2', name: 'Julius Nyerere International Airport', address: 'Julius Nyerere Rd, Dar es Salaam', coordinates: { latitude: -6.8780, longitude: 39.2026 } },
    { id: '3', name: 'Kariakoo Market', address: 'Kariakoo, Dar es Salaam', coordinates: { latitude: -6.8187, longitude: 39.2755 } },
    { id: '4', name: 'Coco Beach', address: 'Toure Dr, Dar es Salaam', coordinates: { latitude: -6.7520, longitude: 39.2700 } },
  ];

  // Simulate search
  useEffect(() => {
    const searchText = activeField === 'pickup' ? pickupSearch : dropoffSearch;
    
    if (searchText.length > 2) {
      setIsSearching(true);
      
      // Simulate API delay
      const timer = setTimeout(() => {
        const filteredResults = mockSearchLocations.filter(
          location => 
            location.name.toLowerCase().includes(searchText.toLowerCase()) || 
            location.address.toLowerCase().includes(searchText.toLowerCase())
        );
        setSearchResults(filteredResults);
        setIsSearching(false);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [pickupSearch, dropoffSearch, activeField]);

  const handleLocationSelect = (location) => {
    if (activeField === 'pickup') {
      setPickupLocation(location);
      setPickupSearch(location.name);
      setMapRegion({
        ...mapRegion,
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
      });
    } else {
      setDropoffLocation(location);
      setDropoffSearch(location.name);
      setMapRegion({
        ...mapRegion,
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
      });
    }
    setSearchResults([]);
  };

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    
    // In a real app, you would use reverse geocoding to get address
    const newLocation = {
      id: `custom-${Date.now()}`,
      name: activeField === 'pickup' ? 'Pickup Location' : 'Dropoff Location',
      address: `Lat: ${coordinate.latitude.toFixed(4)}, Lng: ${coordinate.longitude.toFixed(4)}`,
      coordinates: coordinate,
    };
    
    handleLocationSelect(newLocation);
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
        <View style={styles.inputContainer}>
          {/* Pickup Location */}
          <View style={styles.inputRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="locate" size={20} color="#0066cc" />
            </View>
            <TextInput
              style={[styles.input, activeField === 'pickup' && styles.activeInput]}
              placeholder="Pickup location"
              value={pickupSearch}
              onChangeText={setPickupSearch}
              onFocus={() => setActiveField('pickup')}
            />
            {pickupSearch ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  setPickupSearch('');
                  setPickupLocation(null);
                }}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          {/* Dropoff Location */}
          <View style={styles.inputRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={20} color="#ff6b6b" />
            </View>
            <TextInput
              style={[styles.input, activeField === 'dropoff' && styles.activeInput]}
              placeholder="Dropoff location"
              value={dropoffSearch}
              onChangeText={setDropoffSearch}
              onFocus={() => setActiveField('dropoff')}
            />
            {dropoffSearch ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  setDropoffSearch('');
                  setDropoffLocation(null);
                }}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        
        {/* Search Results */}
        {(searchResults.length > 0 || isSearching) && (
          <View style={styles.searchResults}>
            {isSearching ? (
              <ActivityIndicator style={styles.loader} color="#0066cc" />
            ) : (
              <ScrollView>
                {searchResults.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.resultItem}
                    onPress={() => handleLocationSelect(location)}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <View style={styles.resultTextContainer}>
                      <Text style={styles.resultName}>{location.name}</Text>
                      <Text style={styles.resultAddress}>{location.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
        
        {/* Continue Button */}
        <TouchableOpacity 
          style={[
            styles.continueButton,
            (!pickupLocation || !dropoffLocation) && styles.disabledButton
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 50,
  },
  iconContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  activeInput: {
    borderColor: '#0066cc',
  },
  clearButton: {
    padding: 10,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  loader: {
    padding: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  resultAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
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
