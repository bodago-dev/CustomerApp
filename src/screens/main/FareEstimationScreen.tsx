import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FareEstimationScreen = ({ route, navigation }) => {
  const { packageDetails, pickupLocation, dropoffLocation, selectedVehicle } = route.params || {};
  
  const [isCalculating, setIsCalculating] = useState(true);
  const [fareDetails, setFareDetails] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  
  // Calculate fare based on distance, vehicle type, and package details
  useEffect(() => {
    // Simulate API call to calculate fare
    setTimeout(() => {
      // In a real app, this would be calculated based on actual distance, time, etc.
      const baseFare = selectedVehicle.price;
      const distanceFare = 500; // Additional fare based on distance
      const packageSizeFare = packageDetails.size === 'small' ? 0 : 
                             packageDetails.size === 'medium' ? 500 : 1000;
      const packageWeightFare = packageDetails.weight === 'light' ? 0 : 
                               packageDetails.weight === 'medium' ? 500 : 1000;
      
      const subtotal = baseFare + distanceFare + packageSizeFare + packageWeightFare;
      const serviceFee = Math.round(subtotal * 0.1); // 10% service fee
      const total = subtotal + serviceFee;
      
      setFareDetails({
        baseFare,
        distanceFare,
        packageSizeFare,
        packageWeightFare,
        subtotal,
        serviceFee,
        total,
        distance: 5.2, // km
        estimatedTime: selectedVehicle.estimatedTime,
      });
      
      setIsCalculating(false);
    }, 1500);
  }, []);

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'WELCOME50') {
      // Apply 50% discount
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
                    selectedVehicle.id === 'boda' ? 'motorcycle' :
                    selectedVehicle.id === 'bajaji' ? 'bike-scooter' :
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
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Package Weight</Text>
              <Text style={styles.detailValue}>
                {packageDetails.weight === 'light' ? 'Light' : 
                 packageDetails.weight === 'medium' ? 'Medium' : 'Heavy'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Special Instructions</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {packageDetails.specialInstructions || 'None'}
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
            <Text style={styles.fareLabel}>Distance Charge</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.distanceFare)}</Text>
          </View>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Package Size Charge</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.packageSizeFare)}</Text>
          </View>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Package Weight Charge</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.packageWeightFare)}</Text>
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
            <Text style={styles.fareLabel}>Service Fee</Text>
            <Text style={styles.fareValue}>{formatPrice(fareDetails.serviceFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fareItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(fareDetails.total)}</Text>
          </View>
        </View>
        
        {/* Promo Code */}
        {!promoApplied && (
          <View style={styles.promoContainer}>
            <TouchableOpacity 
              style={styles.promoButton}
              onPress={handleApplyPromo}>
              <Ionicons name="pricetag-outline" size={18} color="#0066cc" />
              <Text style={styles.promoButtonText}>Apply Promo Code: WELCOME50</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Payment Method Selection will be in the next screen */}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}>
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
    marginBottom: 20,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#e6f2ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cce5ff',
    borderStyle: 'dashed',
  },
  promoButtonText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
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
