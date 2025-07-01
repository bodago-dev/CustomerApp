import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import locationService from '../../services/LocationService';
import firestoreService from '../../services/FirestoreService';

const { width } = Dimensions.get('window');

const TrackingScreen = ({ route, navigation }) => {
  const { deliveryId, packageDetails, pickupLocation, dropoffLocation, selectedVehicle, fareDetails, delivery } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryStatus, setDeliveryStatus] = useState('searching');
  const [deliveryData, setDeliveryData] = useState(delivery);
  const [driverInfo, setDriverInfo] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [customerLocation,setCustomerLocation] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const mapRef = useRef(null);
  const [unsubscribeDriver, setUnsubscribeDriver] = useState(null);
  const [unsubscribeDelivery, setUnsubscribeDelivery] = useState(null);
  
  // Status options: searching, accepted, arrived_pickup, picked_up, in_transit, arrived_dropoff, delivered
  
  // Initial region for map (centered between pickup and dropoff)
  const [mapRegion, setMapRegion] = useState({
    latitude: (pickupLocation?.coordinates?.latitude + dropoffLocation?.coordinates?.latitude) / 2,
    longitude: (pickupLocation?.coordinates?.longitude + dropoffLocation?.coordinates?.longitude) / 2,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Simulate delivery flow
  useEffect(() => {
    // Simulate finding a driver
    setTimeout(() => {
      setIsLoading(false);
      setDeliveryStatus('searching');
      
      // Add initial status update
      setStatusUpdates([
        {
          id: '1',
          status: 'Order Placed',
          time: new Date().toLocaleTimeString(),
          description: 'Your delivery request has been placed. Looking for a driver...',
        },
      ]);
      
      // Simulate driver accepting after 3 seconds
      setTimeout(() => {
        const driver = {
          id: 'DRV123',
          name: 'John Makonde',
          phone: '+255712345678',
          rating: 4.8,
          vehicleType: selectedVehicle.id,
          vehiclePlate: 'T 123 ABC',
          photo: require('../../assets/driver-placeholder.jpg'),
        };
        
        setDriverInfo(driver);
        setDeliveryStatus('accepted');
        setDriverLocation({
          latitude: pickupLocation.coordinates.latitude - 0.01,
          longitude: pickupLocation.coordinates.longitude - 0.01,
        });
        setEstimatedArrival('10 min');
        
        // Add status update
        setStatusUpdates(prev => [
          ...prev,
          {
            id: '2',
            status: 'Driver Assigned',
            time: new Date().toLocaleTimeString(),
            description: `${driver.name} has accepted your delivery request.`,
          },
        ]);
        
        // Simulate driver arriving at pickup after 5 seconds
        setTimeout(() => {
          setDeliveryStatus('arrived_pickup');
          setDriverLocation({
            latitude: pickupLocation.coordinates.latitude,
            longitude: pickupLocation.coordinates.longitude,
          });
          setEstimatedArrival('Arrived at pickup');
          
          // Add status update
          setStatusUpdates(prev => [
            ...prev,
            {
              id: '3',
              status: 'Driver Arrived',
              time: new Date().toLocaleTimeString(),
              description: 'Driver has arrived at the pickup location.',
            },
          ]);
          
          // Simulate package picked up after 3 seconds
          setTimeout(() => {
            setDeliveryStatus('picked_up');
            setEstimatedArrival('15 min to destination');
            
            // Add status update
            setStatusUpdates(prev => [
              ...prev,
              {
                id: '4',
                status: 'Package Picked Up',
                time: new Date().toLocaleTimeString(),
                description: 'Your package has been picked up and is on its way.',
              },
            ]);
            
            // Simulate in transit after 2 seconds
            setTimeout(() => {
              setDeliveryStatus('in_transit');
              setDriverLocation({
                latitude: (pickupLocation.coordinates.latitude + dropoffLocation.coordinates.latitude) / 2,
                longitude: (pickupLocation.coordinates.longitude + dropoffLocation.coordinates.longitude) / 2,
              });
              
              // Add status update
              setStatusUpdates(prev => [
                ...prev,
                {
                  id: '5',
                  status: 'In Transit',
                  time: new Date().toLocaleTimeString(),
                  description: 'Your package is on the way to the destination.',
                },
              ]);
              
              // Simulate arrived at dropoff after 5 seconds
              setTimeout(() => {
                setDeliveryStatus('arrived_dropoff');
                setDriverLocation({
                  latitude: dropoffLocation.coordinates.latitude,
                  longitude: dropoffLocation.coordinates.longitude,
                });
                setEstimatedArrival('Arrived at destination');
                
                // Add status update
                setStatusUpdates(prev => [
                  ...prev,
                  {
                    id: '6',
                    status: 'Arrived at Destination',
                    time: new Date().toLocaleTimeString(),
                    description: 'Driver has arrived at the delivery location.',
                  },
                ]);
                
                // Simulate delivered after 3 seconds
                setTimeout(() => {
                  setDeliveryStatus('delivered');
                  setEstimatedArrival('Delivered');
                  
                  // Add status update
                  setStatusUpdates(prev => [
                    ...prev,
                    {
                      id: '7',
                      status: 'Delivered',
                      time: new Date().toLocaleTimeString(),
                      description: 'Your package has been delivered successfully!',
                    },
                  ]);
                }, 3000);
              }, 5000);
            }, 2000);
          }, 3000);
        }, 5000);
      }, 3000);
    }, 2000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'searching':
        return '#ff9800';
      case 'accepted':
        return '#2196f3';
      case 'arrived_pickup':
        return '#2196f3';
      case 'picked_up':
        return '#2196f3';
      case 'in_transit':
        return '#2196f3';
      case 'arrived_dropoff':
        return '#2196f3';
      case 'delivered':
        return '#4caf50';
      default:
        return '#ff9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'searching':
        return 'Looking for a driver';
      case 'accepted':
        return 'Driver assigned';
      case 'arrived_pickup':
        return 'Driver arrived at pickup';
      case 'picked_up':
        return 'Package picked up';
      case 'in_transit':
        return 'Package in transit';
      case 'arrived_dropoff':
        return 'Arrived at destination';
      case 'delivered':
        return 'Package delivered';
      default:
        return 'Processing';
    }
  };

  const handleCallDriver = () => {
    // In a real app, this would initiate a phone call
    alert(`Calling driver at ${driverInfo.phone}`);
  };

  const handleMessageDriver = () => {
    // In a real app, this would open a chat interface
    alert('Messaging driver...');
  };

  const handleViewReceipt = () => {
    // In a real app, this would show a receipt
    alert('Viewing receipt...');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Connecting to delivery network...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}>
        {/* Pickup Marker */}
        <Marker
          coordinate={pickupLocation.coordinates}
          title="Pickup"
          description={pickupLocation.name}>
          <View style={[styles.markerContainer, { backgroundColor: '#e6f2ff' }]}>
            <Ionicons name="locate" size={16} color="#0066cc" />
          </View>
        </Marker>
        
        {/* Dropoff Marker */}
        <Marker
          coordinate={dropoffLocation.coordinates}
          title="Dropoff"
          description={dropoffLocation.name}>
          <View style={[styles.markerContainer, { backgroundColor: '#ffebee' }]}>
            <Ionicons name="location" size={16} color="#ff6b6b" />
          </View>
        </Marker>
        
        {/* Driver Marker */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title={driverInfo?.name || 'Driver'}
            description={`${selectedVehicle.name} • ${driverInfo?.vehiclePlate || ''}`}>
            <View style={[styles.markerContainer, { backgroundColor: '#0066cc' }]}>
              <Ionicons 
                name={
                  selectedVehicle.id === 'boda' ? 'bicycle' : 
                  selectedVehicle.id === 'tuktuk' ? 'car' : 'car-sport'
                } 
                size={16} 
                color="#fff" 
              />
            </View>
          </Marker>
        )}
        
        {/* Route Line */}
        {pickupLocation && dropoffLocation && (
          <Polyline
            coordinates={[
              pickupLocation.coordinates,
              dropoffLocation.coordinates,
            ]}
            strokeWidth={3}
            strokeColor="#0066cc"
            lineDashPattern={[1]}
          />
        )}
      </MapView>
      
      {/* Status Panel */}
      <View style={styles.statusPanel}>
        {/* Delivery ID and Status */}
        <View style={styles.deliveryHeader}>
          <View>
            <Text style={styles.deliveryId}>Order #{deliveryId}</Text>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusIndicator, 
                  { backgroundColor: getStatusColor(deliveryStatus) }
                ]} 
              />
              <Text style={styles.statusText}>{getStatusText(deliveryStatus)}</Text>
            </View>
          </View>
          
          {deliveryStatus === 'delivered' ? (
            <TouchableOpacity 
              style={styles.receiptButton}
              onPress={handleViewReceipt}>
              <Text style={styles.receiptButtonText}>View Receipt</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.eta}>{estimatedArrival}</Text>
          )}
        </View>
        
        {/* Driver Info */}
        {driverInfo && deliveryStatus !== 'delivered' && (
          <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <Image source={driverInfo.photo} style={styles.driverPhoto} />
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverInfo.name}</Text>
                <View style={styles.driverRating}>
                  <Ionicons name="star" size={14} color="#ffc107" />
                  <Text style={styles.driverRatingText}>{driverInfo.rating}</Text>
                </View>
                <Text style={styles.vehicleInfo}>
                  {selectedVehicle.name} • {driverInfo.vehiclePlate}
                </Text>
              </View>
            </View>
            
            <View style={styles.driverActions}>
              <TouchableOpacity 
                style={[styles.driverActionButton, styles.callButton]}
                onPress={handleCallDriver}>
                <Ionicons name="call" size={20} color="#0066cc" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.driverActionButton, styles.messageButton]}
                onPress={handleMessageDriver}>
                <Ionicons name="chatbubble" size={20} color="#0066cc" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Status Timeline */}
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>Delivery Updates</Text>
          <ScrollView style={styles.timeline}>
            {statusUpdates.map((update, index) => (
              <View key={update.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {index < statusUpdates.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineStatus}>{update.status}</Text>
                    <Text style={styles.timelineTime}>{update.time}</Text>
                  </View>
                  <Text style={styles.timelineDescription}>{update.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
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
  map: {
    height: '50%',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  eta: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066cc',
  },
  receiptButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e6f2ff',
    borderRadius: 6,
  },
  receiptButtonText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '500',
  },
  driverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  driverRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 3,
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
  },
  driverActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  callButton: {
    backgroundColor: '#e6f2ff',
  },
  messageButton: {
    backgroundColor: '#e6f2ff',
  },
  timelineContainer: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timeline: {
    flex: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066cc',
    marginTop: 5,
    marginRight: 10,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 17,
    bottom: -15,
    width: 1,
    backgroundColor: '#ddd',
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  timelineDescription: {
    fontSize: 13,
    color: '#666',
  },
});

export default TrackingScreen;
