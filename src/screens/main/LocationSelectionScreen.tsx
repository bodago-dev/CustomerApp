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
  Modal,
  FlatList,
  TextInput,
  Animated,
  Keyboard,
  PanResponder,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';

const { width, height } = Dimensions.get('window');

// Tanzania region centered on Dar es Salaam
const TANZANIA_REGION = {
  latitude: -6.7924,
  longitude: 39.2083,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const LocationSelectionScreen = ({ route, navigation }) => {
  const { packageDetails } = route.params || {};
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [activeField, setActiveField] = useState('pickup');
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  // New states for custom autocomplete
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

  // Panel expansion states
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const MIN_PANEL_HEIGHT = 350;
  const MAX_PANEL_HEIGHT = height * 0.8;
  const panelHeight = useRef(new Animated.Value(MIN_PANEL_HEIGHT)).current;
  const mapRef = useRef(null);

  // Set initial region to Tanzania
  const [mapRegion, setMapRegion] = useState(TANZANIA_REGION);

  useEffect(() => {
    console.log('API Key from Config:', Config.GOOGLE_PLACES_API_KEY);
    setApiReady(!!Config.GOOGLE_PLACES_API_KEY);
  }, []);

  // Handle panel expansion/collapse based on location selection
  useEffect(() => {
    // Auto-expand panel when user starts typing in either field
    if ((pickupQuery || dropoffQuery) && !isPanelExpanded) {
      setIsPanelExpanded(true);
    }

    // Auto-collapse panel only when both locations are selected
    if (pickupLocation && dropoffLocation && isPanelExpanded) {
      const timer = setTimeout(() => {
        setIsPanelExpanded(false);
        setIsKeyboardVisible(false);
      }, 1000); // Delay collapse to show confirmation
      return () => clearTimeout(timer);
    }
  }, [pickupLocation, dropoffLocation, pickupQuery, dropoffQuery]);

  // Handle panel height animation
  useEffect(() => {
    const targetHeight = isPanelExpanded ? MAX_PANEL_HEIGHT : MIN_PANEL_HEIGHT;
    Animated.spring(panelHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [isPanelExpanded]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        if (!isPanelExpanded) {
          setIsPanelExpanded(true);
        }
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
  }, [isPanelExpanded]);

  // PanResponder for manual panel dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newHeight = panelHeight._value - gestureState.dy;
        if (newHeight >= MIN_PANEL_HEIGHT && newHeight <= MAX_PANEL_HEIGHT) {
          panelHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) {
          setIsPanelExpanded(false);
          Keyboard.dismiss();
        } else if (gestureState.dy < -50) {
          setIsPanelExpanded(true);
        } else {
          // Snap back
          const targetHeight = isPanelExpanded ? MAX_PANEL_HEIGHT : MIN_PANEL_HEIGHT;
          Animated.spring(panelHeight, {
            toValue: targetHeight,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Function to handle input focus
  const handleInputFocus = (field: string) => {
    setActiveField(field);
    if (!isPanelExpanded) {
      setIsPanelExpanded(true);
    }
    setIsKeyboardVisible(true);
  };

  // Function to handle input blur
  const handleInputBlur = () => {
    setIsKeyboardVisible(false);
  };

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

      if (data.status === 'OK' && data.predictions) {
        if (field === 'pickup') {
          setPickupSuggestions(data.predictions);
          setShowPickupSuggestions(true);
        } else {
          setDropoffSuggestions(data.predictions);
          setShowDropoffSuggestions(true);
        }
      }
    } catch (error) {
      console.error('Error fetching place predictions:', error);
    }
  };

  // Get place details
  const getPlaceDetails = async (placeId: string, field: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${Config.GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();

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

        const newRegion = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
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

        setMapRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  const handleMapPress = async (event) => {
    const { coordinate } = event.nativeEvent;
    console.log('Map pressed at:', coordinate);

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${Config.GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();

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
          setPickupQuery(firstResult.formatted_address);
        } else {
          setDropoffLocation(newLocation);
          setDropoffQuery(firstResult.formatted_address);
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
          setPickupQuery(newLocation.address);
        } else {
          setDropoffLocation(newLocation);
          setDropoffQuery(newLocation.address);
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!pickupLocation || !dropoffLocation) return;
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

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion} // Set initial region
          region={mapRegion} // Control region with state
          onPress={handleMapPress}
          onMapReady={() => {
            setMapLoaded(true);
            // Zoom to Tanzania region immediately when map loads
            mapRef.current?.animateToRegion(TANZANIA_REGION, 1000);
          }}
          onRegionChangeComplete={(region) => {
              // Optional safety net: if region looks too wide, force zoom
              if (region.latitudeDelta > 5) {
                mapRef.current?.animateToRegion(mapRegion, 800);
              }
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
      </View>

      <Animated.View
        style={[styles.inputPanel, { height: panelHeight }]}
      >
        <View {...panResponder.panHandlers} style={styles.panelHandle}>
          <View style={styles.panelHandleBar} />
        </View>

        <View style={styles.panelContent}>
          <Text style={styles.panelTitle}>Your Delivery Route</Text>

          {/* Pickup Location */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Pickup Location</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="locate" size={20} color="#0066cc" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter pickup location"
                placeholderTextColor="#999"
                value={pickupQuery}
                onChangeText={(text) => {
                  setPickupQuery(text);
                  fetchPlacePredictions(text, 'pickup');
                }}
                onFocus={() => handleInputFocus('pickup')}
                onBlur={handleInputBlur}
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
                placeholderTextColor="#999"
                value={dropoffQuery}
                onChangeText={(text) => {
                  setDropoffQuery(text);
                  fetchPlacePredictions(text, 'dropoff');
                }}
                onFocus={() => handleInputFocus('dropoff')}
                onBlur={handleInputBlur}
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
      </Animated.View>

      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  inputPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 10,
    justifyContent: 'flex-start',
  },
  panelContent: {
    flex: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  panelHandle: {
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  panelHandleBar: {
    width: 50,
    height: 7,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 45,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: 5,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: '#0066cc',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
});

export default LocationSelectionScreen;