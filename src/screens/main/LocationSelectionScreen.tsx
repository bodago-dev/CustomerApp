import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  Keyboard,
  FlatList,
  TextInput,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

const LocationSelectionScreen = ({ route, navigation }) => {
  const { packageDetails } = route.params || {};
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [activeField, setActiveField] = useState('pickup');
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // New states for custom autocomplete
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

  // Bottom sheet ref and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [350, height * 0.8], []);
  const mapRef = useRef<MapView>(null);

  // Tanzania default region (Dar es Salaam area)
  const TANZANIA_REGION = {
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const [mapRegion, setMapRegion] = useState(TANZANIA_REGION);

  useEffect(() => {
    console.log('API Key from Config:', Config.GOOGLE_PLACES_API_KEY);
    setApiReady(!!Config.GOOGLE_PLACES_API_KEY);

    // Focus map on Tanzania region when component loads
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(TANZANIA_REGION, 1000);
      }
    }, 500);
  }, []);

  // Handle keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        // Expand sheet when keyboard appears (for input focus)
        bottomSheetRef.current?.expand();
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Handle bottom sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    console.log('Bottom sheet index:', index);
  }, []);

  // Function to handle input focus - expand sheet
  const handleInputFocus = (field: string) => {
    setActiveField(field);
    bottomSheetRef.current?.expand();
  };

  // Function to handle input blur
  const handleInputBlur = () => {
    // Don't collapse automatically
  };

  // Collapse sheet when both locations are selected (but not if keyboard is open)
  useEffect(() => {
    if (pickupLocation && dropoffLocation && !isKeyboardVisible) {
      const timer = setTimeout(() => {
        bottomSheetRef.current?.collapse();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pickupLocation, dropoffLocation, isKeyboardVisible]);

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

  // Fetch place predictions
  const fetchPlacePredictions = async (query: string, field: string) => {
    if (!query || query.length < 3) {
      if (field === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${Config.GOOGLE_PLACES_API_KEY}&components=country:tz&location=${mapRegion.latitude},${mapRegion.longitude}&radius=20000`
      );
      const data = await response.json();

      console.log('Google Places Autocomplete API Response:', {
        field,
        query,
        status: data.status,
        predictions: data.predictions
      });

      if (data.status === 'OK' && data.predictions) {
        if (field === 'pickup') {
          setPickupSuggestions(data.predictions);
          setShowPickupSuggestions(true);
        } else {
          setDropoffSuggestions(data.predictions);
          setShowDropoffSuggestions(true);
        }
      } else {
        console.log('Google Places Autocomplete API Error:', data.status);
        if (field === 'pickup') {
          setPickupSuggestions([]);
          setShowPickupSuggestions(false);
        } else {
          setDropoffSuggestions([]);
          setShowDropoffSuggestions(false);
        }
      }
    } catch (error) {
      console.error('Error fetching place predictions:', error);
      if (field === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
    }
  };

  // Get place details
  const getPlaceDetails = async (placeId: string, field: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${Config.GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();

      console.log('Google Places Details API Response:', {
        field,
        placeId,
        result: data.result
      });

      if (data.status === 'OK' && data.result) {
        const location = {
          id: data.result.place_id,
          name: data.result.name,
          address: data.result.formatted_address,
          coordinates: {
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng,
          },
          details: data.result,
        };

        if (field === 'pickup') {
          setPickupLocation(location);
          setPickupQuery(data.result.formatted_address);
          setShowPickupSuggestions(false);
        } else {
          setDropoffLocation(location);
          setDropoffQuery(data.result.formatted_address);
          setShowDropoffSuggestions(false);
        }

        // Animate map to selected location
        const newRegion = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };

        setMapRegion(newRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }

        // Log the data
        logPlaceData(
          {
            place_id: data.result.place_id,
            structured_formatting: {
              main_text: data.result.name,
              secondary_text: data.result.formatted_address
            },
            description: data.result.formatted_address,
            types: data.result.types
          },
          data.result,
          field
        );
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      alert('Failed to get location details');
    }
  };

  const handleMapPress = async (event) => {
    console.log('Map pressed at:', event.nativeEvent.coordinate);
    const { coordinate } = event.nativeEvent;

    // Determine which field to set based on current state
    let fieldToSet = activeField;
    
    if (!pickupLocation) {
      fieldToSet = 'pickup';
    } else if (!dropoffLocation && activeField === 'pickup') {
      fieldToSet = 'dropoff';
    }

    // Dismiss keyboard if open
    Keyboard.dismiss();

    // Expand sheet to show the input
    bottomSheetRef.current?.expand();

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

        if (fieldToSet === 'pickup') {
          setPickupLocation(newLocation);
          setPickupQuery(firstResult.formatted_address);
          setActiveField('pickup');
          console.log('Map tap: Set as Pickup Location:', newLocation);
        } else {
          setDropoffLocation(newLocation);
          setDropoffQuery(firstResult.formatted_address);
          setActiveField('dropoff');
          console.log('Map tap: Set as Dropoff Location:', newLocation);
        }
      } else {
        const newLocation = {
          id: `custom-${Date.now()}`,
          name: fieldToSet === 'pickup' ? 'Pickup Location' : 'Dropoff Location',
          address: `Lat: ${coordinate.latitude.toFixed(4)}, Lng: ${coordinate.longitude.toFixed(4)}`,
          coordinates: coordinate,
        };

        if (fieldToSet === 'pickup') {
          setPickupLocation(newLocation);
          setPickupQuery(newLocation.address);
          setActiveField('pickup');
          console.log('Map tap: Set as Pickup Location (no address):', newLocation);
        } else {
          setDropoffLocation(newLocation);
          setDropoffQuery(newLocation.address);
          setActiveField('dropoff');
          console.log('Map tap: Set as Dropoff Location (no address):', newLocation);
        }
      }

      // Animate map to the tapped location
      const newRegion = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      setMapRegion(newRegion);
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      alert('Failed to get address for this location');
    } finally {
      setIsLoading(false);
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

  const renderSuggestionItem = ({ item }, field: string) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => getPlaceDetails(item.place_id, field)}
    >
      <Ionicons
        name="location-outline"
        size={20}
        color="#666"
        style={styles.suggestionIcon}
      />
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionMainText}>
          {item.structured_formatting?.main_text || item.description}
        </Text>
        <Text style={styles.suggestionSecondaryText}>
          {item.structured_formatting?.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render handle component for bottom sheet
  const renderHandle = () => (
    <View style={styles.sheetHandle}>
      <View style={styles.sheetHandleBar} />
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onPress={handleMapPress}
          onMapReady={() => {
            setMapLoaded(true);
            // Ensure map is focused on Tanzania
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion(TANZANIA_REGION, 1000);
              }
            }, 100);
          }}
          mapType="standard"
          userInterfaceStyle="light"
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={true}
          pitchEnabled={true}
          initialRegion={TANZANIA_REGION}
        >
          {pickupLocation && (
            <Marker
              coordinate={pickupLocation.coordinates}
              title={pickupLocation.name}
              description={pickupLocation.address}
              pinColor="#0066cc"
            >
              <View style={styles.markerContainer}>
                <Ionicons name="locate" size={20} color="#fff" />
              </View>
            </Marker>
          )}
          {dropoffLocation && (
            <Marker
              coordinate={dropoffLocation.coordinates}
              title={dropoffLocation.name}
              description={dropoffLocation.address}
              pinColor="#ff6b6b"
            >
              <View style={styles.markerContainer}>
                <Ionicons name="location" size={20} color="#fff" />
              </View>
            </Marker>
        )}
      </MapView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Getting address...</Text>
        </View>
      )}

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        onChange={handleSheetChanges}
        handleComponent={renderHandle}
        enablePanDownToClose={false}
        enableOverDrag={true}
        animateOnMount={true}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.panelTitle}>Your Delivery Route</Text>

            {/* Pickup Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Pickup Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="locate" size={20} color="#0066cc" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter pickup location"
                  placeholderTextColor="#666"
                  value={pickupQuery}
                  onChangeText={(text) => {
                    setPickupQuery(text);
                    fetchPlacePredictions(text, 'pickup');
                  }}
                  onFocus={() => handleInputFocus('pickup')}
                  onBlur={handleInputBlur}
                  returnKeyType="done"
                />
                {pickupLocation && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setPickupLocation(null);
                      setPickupQuery('');
                      setPickupSuggestions([]);
                      setShowPickupSuggestions(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Pickup Suggestions */}
              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={pickupSuggestions}
                    renderItem={(item) => renderSuggestionItem(item, 'pickup')}
                    keyExtractor={(item) => item.place_id}
                    style={styles.suggestionsList}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}
            </View>

            {/* Dropoff Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Dropoff Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location" size={20} color="#ff6b6b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter dropoff location"
                  placeholderTextColor="#666"
                  value={dropoffQuery}
                  onChangeText={(text) => {
                    setDropoffQuery(text);
                    fetchPlacePredictions(text, 'dropoff');
                  }}
                  onFocus={() => handleInputFocus('dropoff')}
                  onBlur={handleInputBlur}
                  returnKeyType="done"
                />
                {dropoffLocation && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setDropoffLocation(null);
                      setDropoffQuery('');
                      setDropoffSuggestions([]);
                      setShowDropoffSuggestions(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dropoff Suggestions */}
              {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={dropoffSuggestions}
                    renderItem={(item) => renderSuggestionItem(item, 'dropoff')}
                    keyExtractor={(item) => item.place_id}
                    style={styles.suggestionsList}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}
            </View>

            {/* Map Selection Hint */}
            <View style={styles.panelHint}>
              <Ionicons name="map-outline" size={16} color="#666" />
              <Text style={styles.panelHintText}>
                Tip: You can also tap directly on the map to select a location
              </Text>
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
          </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
    zIndex: 0,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
  sheetContent: {
    flex: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#fff',
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 45,
    paddingRight: 40,
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
    padding: 5,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 5,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066cc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    width: 100,
    height: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#333',
  },
  panelHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 15,
  },
  panelHintText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    textAlign: 'center',
  },
});

export default LocationSelectionScreen;