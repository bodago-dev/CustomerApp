import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import locationService from '../../services/LocationService';

const FareEstimationScreen = ({ route, navigation }) => {
  const { packageDetails = {}, pickupLocation = {}, dropoffLocation = {}, selectedVehicle = {} } = route.params || {};

  const [isCalculating, setIsCalculating] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fareDetails, setFareDetails] = useState({
    baseFare: 0,
    distanceFare: 0,
    packageSizeMultiplier: 1,
    subtotal: 0,
    serviceFee: 0,
    total: 0,
    distance: 0,
    estimatedTime: 'Calculating...'
  });
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Base prices per km for each vehicle type (in TZS)
  const VEHICLE_RATES = {
    boda: {
      baseRate: 2000,
      perKm: 500,
      minFare: 1000,
    },
    bajaji: {
      baseRate: 3000,
      perKm: 750,
      minFare: 2000,
      
    },
    guta: {
      baseRate: 5000,
      perKm: 1000,
      minFare: 5000,
    }
  };

  // Size multipliers only
  const SIZE_MULTIPLIERS = {
    small: 1.0,
    medium: 1.5,
    large: 1.8
  };

  const calculateDistance = async () => {
    try {
      if (!pickupLocation?.coordinates || !dropoffLocation?.coordinates) {
        console.warn('Missing location coordinates, using default distance');
        return 5; // Default 5km if coordinates missing
      }

      const distanceKm = await locationService.calculateDistance(
        pickupLocation.coordinates,
        dropoffLocation.coordinates
      );

      return Number(distanceKm) || 5;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 5; // Fallback distance
    }
  };

  const calculateFare = async () => {
    setIsCalculating(true);

    try {
      const distanceKm = await calculateDistance();

      // Get vehicle rates with fallback to boda if not specified
      const vehicleType = selectedVehicle?.id || 'boda';
      const vehicleRates = VEHICLE_RATES[vehicleType] || VEHICLE_RATES.boda;

      // Calculate base fare - covers first 3km
      let baseFare = vehicleRates.baseRate;

      // Calculate distance fare for any distance beyond 3km
      let distanceFare = 0;
      if (distanceKm > 3) {
        const additionalKm = distanceKm - 3;
        distanceFare = additionalKm * vehicleRates.perKm;
      }

      // Total fare before size multiplier
      let totalBeforeMultiplier = baseFare + distanceFare;
      totalBeforeMultiplier = Math.max(totalBeforeMultiplier, vehicleRates.minFare);

      // Apply package size multiplier only
      const sizeMultiplier = SIZE_MULTIPLIERS[packageDetails?.size || 'small'] || 1;

      // Calculate subtotal
      let subtotal = totalBeforeMultiplier * sizeMultiplier;
      subtotal = Math.round(subtotal / 100) * 100;

      // Calculate service fee (18% of subtotal)
      const serviceFee = Math.round(subtotal * 0.18);

      setFareDetails({
        baseFare,
        distanceFare: Math.round(distanceFare * sizeMultiplier),
        packageSizeMultiplier: sizeMultiplier,
        subtotal,
        serviceFee,
        total: subtotal + serviceFee,
        distance: parseFloat(distanceKm.toFixed(1)),
        estimatedTime: calculateEstimatedTime(distanceKm, vehicleType),
      });

    } catch (error) {
      console.error('Error calculating fare:', error);
      // Fallback to default pricing
      setFareDetails({
        baseFare: 3500,
        distanceFare: 1500,
        packageSizeMultiplier: 1,
        subtotal: 5000,
        serviceFee: 750,
        total: 5750,
        distance: 5,
        estimatedTime: '20-30 min',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateEstimatedTime = (distanceKm, vehicleType) => {
    const averageSpeeds = {
      boda: 30,
      bajaji: 25,
      guta: 20
    };

    const baseTime = 10;
    const travelTime = (distanceKm / averageSpeeds[vehicleType]) * 60;
    const totalTime = baseTime + travelTime;
    const minTime = Math.max(10, Math.round(totalTime * 0.8));
    const maxTime = Math.round(totalTime * 1.2);

    return `${minTime}-${maxTime} min`;
  };

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'WELCOME50') {
      setFareDetails(prev => ({
        ...prev,
        discount: Math.round(prev.subtotal * 0.5),
        total: Math.round(prev.subtotal * 0.5) + prev.serviceFee,
      }));
      setPromoApplied(true);
    } else {
      alert('Invalid promo code');
    }
  };

  const handleContinue = () => {
    navigation.navigate('Payment', {
      packageDetails,
      pickupLocation,
      dropoffLocation,
      selectedVehicle,
      fareDetails,
    });
  };

  const formatPrice = (price) => {
    return `TZS ${price.toLocaleString()}`;
  };

  useEffect(() => {
    calculateFare();
  }, []);

  if (isCalculating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Calculating fare...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Fare Estimate</Text>
        <Text style={styles.subtitle}>Review your delivery details and fare</Text>

        {/* Route Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          <View style={styles.routeInfo}>
            <View style={styles.locationRow}>
              <Ionicons name="locate" size={16} color="#0066cc" />
              <Text style={styles.locationText}>
                {pickupLocation?.address || 'Pickup location'}
              </Text>
            </View>
            <View style={styles.routeDivider}>
              <View style={styles.routeDividerLine} />
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#ff6b6b" />
              <Text style={styles.locationText}>
                {dropoffLocation?.address || 'Dropoff location'}
              </Text>
            </View>
          </View>

          <View style={styles.routeDetails}>
            <View style={styles.routeDetailItem}>
              <Ionicons name="speedometer-outline" size={16} color="#666" />
              <Text style={styles.routeDetailText}>
                {fareDetails.distance} km
              </Text>
            </View>
            <View style={styles.routeDetailItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.routeDetailText}>
                {fareDetails.estimatedTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle & Package Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Details</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vehicle Type</Text>
              <View style={styles.detailValueContainer}>
                <Ionicons
                  name={
                    selectedVehicle.id === 'boda' ? 'bicycle' :
                    selectedVehicle.id === 'bajaji' ? 'car' :
                    selectedVehicle.id === 'guta' ? 'dump-truck' : 'car'
                  }
                  size={16}
                  color="#0066cc"
                />
                <Text style={styles.detailValue}>{selectedVehicle.name}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Package Size</Text>
              <Text style={styles.detailValue}>
                {packageDetails.size === 'small' ? 'Small' :
                 packageDetails.size === 'medium' ? 'Medium' : 'Large'}
              </Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Breakdown</Text>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.baseFare)}</Text>
          </View>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Distance ({fareDetails.distance} km)</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.distanceFare)}</Text>
          </View>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Size Multiplier (x{fareDetails.packageSizeMultiplier})</Text>
            <Text style={styles.fareValue}>Applied</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Subtotal</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.subtotal)}</Text>
          </View>

          {fareDetails.discount && (
            <View style={styles.fareItem}>
              <Text style={[styles.fareLabel, styles.discountText]}>Promo Discount</Text>
              <Text style={[styles.fareValue, styles.discountText]}>
                -{formatPrice(fareDetails.discount)}
              </Text>
            </View>
          )}

          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Service Fee (18%)</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.serviceFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fareItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(fareDetails.total)}</Text>
          </View>
        </View>

        {/* Promo Code */}
        {/* !promoApplied && (
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              value={promoCode}
              onChangeText={setPromoCode}
              onSubmitEditing={handleApplyPromo}
            />
            <TouchableOpacity
              style={styles.promoButton}
              onPress={handleApplyPromo}>
              <Text style={styles.promoButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        ) */
    }
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, isProcessing && styles.disabledButton]}
          onPress={handleContinue}
          disabled={isProcessing}>
          <Text style={styles.continueButtonText}>Continue to Payment</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  routeInfo: {
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
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
  routeDetails: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  routeDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
  },
  fareValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  discountText: {
    color: '#4caf50',
  },
  promoContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    fontSize: 16,
  },
  promoButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  promoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#99ccff',
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
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default FareEstimationScreen;