import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PaymentScreen = ({ route, navigation }) => {
  const { packageDetails, pickupLocation, dropoffLocation, selectedVehicle, fareDetails } = route.params || {};
  
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const paymentMethods = [
    { id: 'mpesa', name: 'M-Pesa', icon: require('../../assets/mpesa.jpg') },
    { id: 'mixx', name: 'Mixx by Yas', icon: require('../../assets/mixx.png') },
    { id: 'airtelmoney', name: 'Airtel Money', icon: require('../../assets/airtel-money.png') },
  ];

  const handlePayment = () => {
    // Basic validation
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    setIsProcessing(true);

    // Simulate M-Pesa STK push API call
    setTimeout(() => {
      setIsProcessing(false);
      
      // Show success message and navigate to tracking
      Alert.alert(
        'Payment Initiated',
        'Please check your phone for the M-Pesa payment prompt and enter your PIN to complete the payment.',
        [
          {
            text: 'OK',
            onPress: () => {
              // In a real app, we would listen for payment confirmation
              // For demo, we'll simulate a successful payment
              navigation.navigate('Tracking', {
                deliveryId: 'DEL' + Math.floor(Math.random() * 10000),
                packageDetails,
                pickupLocation,
                dropoffLocation,
                selectedVehicle,
                fareDetails,
              });
            },
          },
        ]
      );
    }, 2000);
  };

  const formatPrice = (price) => {
    return `TZS ${price.toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.subtitle}>Choose your payment method</Text>
        
        {/* Payment Methods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentMethodsContainer}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === method.id && styles.selectedPaymentMethod,
                ]}
                onPress={() => setPaymentMethod(method.id)}>
                <Image source={method.icon} style={styles.paymentMethodIcon} />
                <Text
                  style={[
                    styles.paymentMethodName,
                    paymentMethod === method.id && styles.selectedPaymentMethodText,
                  ]}>
                  {method.name}
                </Text>
                {paymentMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#0066cc" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Phone Number Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mobile Money Number</Text>
          <Text style={styles.helperText}>
            Enter the phone number registered with {
              paymentMethod === 'mpesa' ? 'M-Pesa' : 
              paymentMethod === 'mixx' ? 'Mixx by Yas' : 'Airtel Money'
            }
          </Text>
          
          <View style={styles.phoneInputContainer}>
            <Text style={styles.countryCode}>+255</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="712 345 678"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={10}
            />
          </View>
        </View>
        
        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Package</Text>
            <Text style={styles.summaryValue}>
              {packageDetails.size === 'small' ? 'Small' : 
               packageDetails.size === 'medium' ? 'Medium' : 'Large'}, 
              {packageDetails.weight === 'light' ? ' Light' : 
               packageDetails.weight === 'medium' ? ' Medium' : ' Heavy'}
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Vehicle</Text>
            <Text style={styles.summaryValue}>{selectedVehicle.name}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{fareDetails.distance} km</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Estimated Time</Text>
            <Text style={styles.summaryValue}>{fareDetails.estimatedTime}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatPrice(fareDetails.total)}</Text>
          </View>
        </View>
        
        {/* Terms and Conditions */}
        <View style={styles.termsContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.termsText}>
            By proceeding, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.disabledButton]}
          onPress={handlePayment}
          disabled={isProcessing || !phoneNumber}>
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay {formatPrice(fareDetails.total)}</Text>
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
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  selectedPaymentMethod: {
    borderColor: '#0066cc',
    backgroundColor: '#f0f7ff',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  paymentMethodName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  selectedPaymentMethodText: {
    color: '#0066cc',
    fontWeight: '500',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
  },
  countryCode: {
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    height: '100%',
    textAlignVertical: 'center',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    flex: 1,
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
  payButton: {
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
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default PaymentScreen;
