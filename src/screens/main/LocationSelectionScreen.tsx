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
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

const LocationSelectionScreen = ({ route, navigation }) => {
  const { packageDetails } = route.params || {};

  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff'>('pickup');

  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Bottom sheet ref and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['30%', '70%', '85%'], []);

  const [mapRegion, setMapRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  }, []);

  // Expand panel
  const expandPanel = () => {
    bottomSheetRef.current?.expand();
  };

  // Collapse panel
  const collapsePanel = () => {
    bottomSheetRef.current?.collapse();
  };

  // Close panel (to lowest point)
  const closePanel = () => {
    bottomSheetRef.current?.close();
  };

  // Auto expand/collapse logic
  useEffect(() => {
    if ((pickupQuery || dropoffQuery) && !pickupLocation && !dropoffLocation) {
      expandPanel();
    }

    // Collapse only when both are selected
    if (pickupLocation && dropoffLocation) {
      const timer = setTimeout(() => {
        collapsePanel();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pickupLocation, dropoffLocation, pickupQuery, dropoffQuery]);

  // Optional: collapse when keyboard hides
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      if (!pickupLocation || !dropoffLocation) {
        collapsePanel();
      }
    });
    return () => sub.remove();
  }, [pickupLocation, dropoffLocation]);

  // Input focus handler
  const handleInputFocus = (field: 'pickup' | 'dropoff') => {
    setActiveField(field);
    expandPanel();
  };

  // Placeholder functions - replace with your actual implementations
  const fetchPlacePredictions = (query: string, field: 'pickup' | 'dropoff') => {
    console.log('Fetching predictions for:', query, field);
    // Your existing implementation here
  };

  const getPlaceDetails = (placeId: string, field: 'pickup' | 'dropoff') => {
    console.log('Getting details for:', placeId, field);
    // Your existing implementation here
  };

  const handleMapPress = (event: any) => {
    console.log('Map pressed:', event.nativeEvent.coordinate);
    // Your existing implementation here
  };

  const handleContinue = () => {
    if (!pickupLocation || !dropoffLocation) return;
    navigation.navigate('VehicleSelection', { packageDetails, pickupLocation, dropoffLocation });
  };

  const renderSuggestionItem = ({ item }, field: string) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => {
        getPlaceDetails(item.place_id, field);
      }}
    >
      <Ionicons
        name="location-outline"
        size={20}
        color="#0066cc"
        style={styles.suggestionIcon}
      />
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionMainText}>{item.main_text}</Text>
        <Text style={styles.suggestionSecondaryText}>{item.secondary_text}</Text>
      </View>
    </TouchableOpacity>
  );

  // Custom backdrop component
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
      />
    ),
    []
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        region={mapRegion}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton
      >
        {pickupLocation && (
          <Marker
            coordinate={{
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
            }}
            title="Pickup Location"
            pinColor="#0066cc"
          />
        )}
        {dropoffLocation && (
          <Marker
            coordinate={{
              latitude: dropoffLocation.latitude,
              longitude: dropoffLocation.longitude,
            }}
            title="Dropoff Location"
            pinColor="#ff4444"
          />
        )}
      </MapView>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <BottomSheetView style={styles.sheetContentContainer}>
          <KeyboardAwareScrollView
            style={styles.panelContent}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={Platform.OS === 'ios' ? 80 : 0}
            enableOnAndroid
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.panelTitle}>Your Delivery Route</Text>

            {/* Pickup */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Pickup Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="locate" size={20} color="#0066cc" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter pickup location"
                  value={pickupQuery}
                  onChangeText={(text) => {
                    setPickupQuery(text);
                    fetchPlacePredictions(text, 'pickup');
                    setShowPickupSuggestions(true);
                  }}
                  onFocus={() => handleInputFocus('pickup')}
                />
                {pickupLocation && (
                  <TouchableOpacity
                    onPress={() => {
                      setPickupLocation(null);
                      setPickupQuery('');
                      setShowPickupSuggestions(false);
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={pickupSuggestions}
                    renderItem={(props) => renderSuggestionItem(props, 'pickup')}
                    keyExtractor={(item) => item.place_id}
                    keyboardShouldPersistTaps="handled"
                    style={styles.suggestionsList}
                  />
                </View>
              )}
            </View>

            {/* Dropoff */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Dropoff Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color="#ff4444" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter dropoff location"
                  value={dropoffQuery}
                  onChangeText={(text) => {
                    setDropoffQuery(text);
                    fetchPlacePredictions(text, 'dropoff');
                    setShowDropoffSuggestions(true);
                  }}
                  onFocus={() => handleInputFocus('dropoff')}
                />
                {dropoffLocation && (
                  <TouchableOpacity
                    onPress={() => {
                      setDropoffLocation(null);
                      setDropoffQuery('');
                      setShowDropoffSuggestions(false);
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={dropoffSuggestions}
                    renderItem={(props) => renderSuggestionItem(props, 'dropoff')}
                    keyExtractor={(item) => item.place_id}
                    keyboardShouldPersistTaps="handled"
                    style={styles.suggestionsList}
                  />
                </View>
              )}
            </View>

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
          </KeyboardAwareScrollView>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  sheetContentContainer: {
    flex: 1,
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  panelContent: {
    flex: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
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
    marginBottom: 20,
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
});

export default LocationSelectionScreen;