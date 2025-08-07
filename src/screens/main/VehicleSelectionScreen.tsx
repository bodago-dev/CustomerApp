import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const VehicleSelectionScreen = ({ route, navigation }) => {
  const { packageDetails, pickupLocation, dropoffLocation } = route.params || {};
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Vehicle options based on package size and weight
  const vehicleOptions = [
    {
      id: 'boda',
      name: 'Boda Boda',
      icon: 'motorcycle',
      image: require('../../assets/boda.png'),
      description: 'Motorcycle delivery',
      estimatedTime: '15-25 min',
      price: 3500, // TZS
      suitableFor: 'Small packages up to 25kg',
      available: true,
    },
    {
      id: 'bajaji',
      name: 'Bajaji',
      icon: 'bike-scooter',
      image: require('../../assets/bajaji.png'),
      description: 'Bajaji delivery',
      estimatedTime: '20-30 min',
      price: 5000, // TZS
      suitableFor: 'Medium packages 25kg to 75kg',
      available: true,
    },
    {
      id: 'guta',
      name: 'Guta',
      icon: 'dump-truck',
      image: require('../../assets/guta.png'),
      description: 'Guta delivery',
      estimatedTime: '25-40 min',
      price: 8000, // TZS
      suitableFor: 'Large packages 75kg and above',
      available: true,
    },
  ];

  // Filter available vehicles based on package size and weight
  const getAvailableVehicles = () => {
    if (!packageDetails) return vehicleOptions;

    const { size } = packageDetails;

    if (size === 'large') {
      // Only Guta can handle large packages
      return vehicleOptions.map(vehicle => ({
        ...vehicle,
        available: vehicle.id === 'guta',
      }));
    } else if (size === 'medium') {
      // Bajajis and Gutas can handle medium packages
      return vehicleOptions.map(vehicle => ({
        ...vehicle,
        available: vehicle.id !== 'boda',
      }));
    }

    // All vehicles can handle small packages
    return vehicleOptions;
  };

  const availableVehicles = getAvailableVehicles();

  const handleContinue = () => {
    if (!selectedVehicle) {
      alert('Please select a vehicle type');
      return;
    }
    
    navigation.navigate('FareEstimation', {
      packageDetails,
      pickupLocation,
      dropoffLocation,
      selectedVehicle,
    });
  };

  const formatPrice = (price) => {
    return `TZS ${price.toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Select Vehicle Type</Text>
        <Text style={styles.subtitle}>Choose the best option for your package</Text>
        
        <View style={styles.routeCard}>
          <View style={styles.routeInfo}>
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Ionicons name="locate" size={16} color="#0066cc" />
              </View>
              <Text style={styles.locationText} numberOfLines={1}>
                {pickupLocation?.address || 'Pickup location'}
              </Text>
            </View>
            <View style={styles.routeDivider}>
              <View style={styles.routeDividerLine} />
            </View>
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={16} color="#ff6b6b" />
              </View>
              <Text style={styles.locationText} numberOfLines={1}>
                {dropoffLocation?.address || 'Dropoff location'}
              </Text>
            </View>
          </View>
          
          <View style={styles.packageInfo}>
            <Text style={styles.packageInfoText}>
              {packageDetails?.size === 'small' ? 'Small' : 
               packageDetails?.size === 'medium' ? 'Medium' : 'Large'} package, 
              {packageDetails?.weight === 'light' ? ' light' : 
               packageDetails?.weight === 'medium' ? ' medium' : ' heavy'} weight
            </Text>
          </View>
        </View>
        
        <View style={styles.vehiclesContainer}>
          {availableVehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                selectedVehicle?.id === vehicle.id && styles.selectedVehicleCard,
                !vehicle.available && styles.unavailableVehicleCard,
              ]}
              onPress={() => vehicle.available && setSelectedVehicle(vehicle)}
              disabled={!vehicle.available}>
              <View style={styles.vehicleImageContainer}>
                <Image source={vehicle.image} style={styles.vehicleImage} />
                {!vehicle.available && (
                  <View style={styles.unavailableOverlay}>
                    <Text style={styles.unavailableText}>Not Available</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.vehicleDetails}>
                <View style={styles.vehicleNameRow}>
                  <Text style={[
                    styles.vehicleName,
                    selectedVehicle?.id === vehicle.id && styles.selectedText,
                    !vehicle.available && styles.unavailableText,
                  ]}>
                    {vehicle.name}
                  </Text>
                  {selectedVehicle?.id === vehicle.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#0066cc" />
                  )}
                </View>
                
                <Text style={[
                  styles.vehicleDescription,
                  !vehicle.available && styles.unavailableText,
                ]}>
                  {vehicle.description}
                </Text>
                
                <View style={styles.vehicleSpecs}>
                  <View style={styles.vehicleSpecItem}>
                    <Ionicons name="time-outline" size={14} color={!vehicle.available ? '#999' : '#666'} />
                    <Text style={[
                      styles.vehicleSpecText,
                      !vehicle.available && styles.unavailableText,
                    ]}>
                      {vehicle.estimatedTime}
                    </Text>
                  </View>
                  
                  <View style={styles.vehicleSpecItem}>
                    <Ionicons name="cube-outline" size={14} color={!vehicle.available ? '#999' : '#666'} />
                    <Text style={[
                      styles.vehicleSpecText,
                      !vehicle.available && styles.unavailableText,
                    ]}>
                      {vehicle.suitableFor}
                    </Text>
                  </View>
                </View>
                
                <Text style={[
                  styles.vehiclePrice,
                  selectedVehicle?.id === vehicle.id && styles.selectedPrice,
                  !vehicle.available && styles.unavailableText,
                ]}>
                  {formatPrice(vehicle.price)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedVehicle && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!selectedVehicle}>
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
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding for footer
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routeInfo: {
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  locationIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  routeDivider: {
    paddingLeft: 12,
    height: 15,
  },
  routeDividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#ddd',
  },
  packageInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 5,
  },
  packageInfoText: {
    fontSize: 13,
    color: '#666',
  },
  vehiclesContainer: {
    marginBottom: 20,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  selectedVehicleCard: {
    borderWidth: 2,
    borderColor: '#0066cc',
  },
  unavailableVehicleCard: {
    opacity: 0.7,
  },
  vehicleImageContainer: {
    height: 215,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    color: '#999',
  },
  vehicleDetails: {
    padding: 15,
  },
  vehicleNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedText: {
    color: '#0066cc',
  },
  vehicleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  vehicleSpecs: {
    marginBottom: 10,
  },
  vehicleSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  vehicleSpecText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedPrice: {
    color: '#0066cc',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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

export default VehicleSelectionScreen;
