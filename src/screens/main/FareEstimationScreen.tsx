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
import fareService from '../../services/FareService';

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

  const calculateFare = async () => {
    setIsCalculating(true);

    try {
      const details = await fareService.calculateFare({
        pickupCoordinates: pickupLocation?.coordinates,
        dropoffCoordinates: dropoffLocation?.coordinates,
        vehicleType: selectedVehicle?.id,
        packageSize: packageDetails?.size
      });
      
      setFareDetails(details);
    } catch (error) {
      console.error('Error calculating fare:', error);
    } finally {
      setIsCalculating(false);
    }
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
    return fareService.formatPrice(price);
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promo Code</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              editable={!promoApplied}
            />
            <TouchableOpacity
              style={[styles.promoButton, promoApplied && styles.promoButtonDisabled]}
              onPress={handleApplyPromo}
              disabled={promoApplied || !promoCode}>
              <Text style={styles.promoButtonText}>
                {promoApplied ? 'Applied' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </View>
          {promoApplied && (
            <Text style={styles.promoSuccessText}>Promo code WELCOME50 applied successfully!</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Confirm & Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
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
    marginTop: 10,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  routeInfo: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
    flex: 1,
  },
  routeDivider: {
    height: 12,
    marginLeft: 7,
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
    marginVertical: 2,
  },
  routeDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 4,
  },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  routeDetailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 4,
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
    marginVertical: 10,
  },
  discountText: {
    color: '#2ecc71',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  promoContainer: {
    flexDirection: 'row',
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 10,
  },
  promoButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoButtonDisabled: {
    backgroundColor: '#ccc',
  },
  promoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  promoSuccessText: {
    color: '#2ecc71',
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
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
