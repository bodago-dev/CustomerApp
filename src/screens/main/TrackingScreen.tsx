import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import firestoreService from '../../services/FirestoreService';
import locationService from '../../services/LocationService';
import Config from 'react-native-config';

const { width, height } = Dimensions.get('window');

const TrackingScreen = ({ route, navigation }) => {
  const { deliveryId } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [deliveryStatus, setDeliveryStatus] = useState('searching');
  const [deliveryData, setDeliveryData] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [searchingTime, setSearchingTime] = useState(0);

  // Enhanced navigation states
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [driverPath, setDriverPath] = useState([]);

  const mapRef = useRef(null);

  const [mapRegion, setMapRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Polyline decoding function for Google Directions API
  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }
    return points;
  };

  // Fetch actual route from Directions API
  const fetchRoute = async (origin, destination) => {
    try {
      if (!Config.GOOGLE_PLACES_API_KEY) {
        console.warn('Google Maps API key not configured');
        return;
      }

      const apiKey = Config.GOOGLE_PLACES_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}&mode=driving`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoordinates(points);

        // Fit map to show entire route
        if (points.length > 0) {
          const coordinates = [origin, destination, ...points];
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const isValidStatusTransition = useCallback((currentStatus, newStatus) => {
    const validTransitions = {
      pending: ['searching'],
      searching: ['accepted', 'cancelled'],
      accepted: ['arrived_pickup', 'cancelled'],
      arrived_pickup: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['arrived_dropoff', 'cancelled'],
      arrived_dropoff: ['delivered'],
    };
    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }, []);

  const startSearchTimer = useCallback(() => {
    setSearchingTime(0);
    const timer = setInterval(() => {
      setSearchingTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDriverInfo = useCallback(async (driverId) => {
    const result = await firestoreService.getUserProfile(driverId);
    if (result.success && result.userProfile) {
      setDriverInfo(result.userProfile);
    } else {
      console.error('Failed to fetch driver info:', result.error);
    }
  }, []);

  const handleDeliveryUpdate = useCallback((updatedDelivery) => {
    if (!updatedDelivery) return;

    const currentStatus = deliveryStatus;
    const newStatus = updatedDelivery.status === 'pending' ? 'searching' : updatedDelivery.status;

    // Validate status transition
    if (currentStatus !== newStatus && !isValidStatusTransition(currentStatus, newStatus)) {
      console.warn(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      return;
    }

    setDeliveryStatus(newStatus);
    setDeliveryData(updatedDelivery);

    // Append-only logic — unique on statusKey + timestamp
    const incomingEntries = Object.entries(updatedDelivery.timeline || {}).map(([key, ts]) => {
      const dateObj = ts?.toDate?.();
      return {
        id: `${key}_${dateObj?.getTime()}`,
        statusKey: key,
        status: getStatusText(key),
        timeObj: dateObj,
        description: `Delivery status updated to ${getStatusText(key)}.`
      };
    });

    setStatusUpdates(prevUpdates => {
      const existingIds = new Set(prevUpdates.map(u => u.id));
      const newItems = incomingEntries.filter(entry => !existingIds.has(entry.id));

      const merged = [...prevUpdates, ...newItems].sort((a, b) => a.timeObj - b.timeObj);

      return merged.map(entry => ({
        ...entry,
        time: entry.timeObj?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    });

    // Handle driver assignment
    if (newStatus === 'accepted' && updatedDelivery.driverId && !driverInfo) {
      fetchDriverInfo(updatedDelivery.driverId);
      return firestoreService.subscribeToDriverLocation(
        updatedDelivery.driverId,
        (location) => {
          if (location) {
            setDriverLocation(location);
            // Update driver path
            setDriverPath(prev => [...prev, location]);
          }
        }
      );
    }
  }, [deliveryStatus, driverInfo, fetchDriverInfo, isValidStatusTransition]);

  useEffect(() => {
    if (!deliveryId) {
      Alert.alert('Error', 'Delivery ID is missing.');
      navigation.goBack();
      return;
    }

    let unsubscribeDelivery = () => {};
    let unsubscribeDriver = () => {};
    let searchTimerCleanup = () => {};

    const fetchAndSubscribeDelivery = async () => {
      setIsLoading(true);
      try {
        const initialDeliveryResult = await firestoreService.getDelivery(deliveryId);
        if (initialDeliveryResult.success && initialDeliveryResult.delivery) {
          const initialData = initialDeliveryResult.delivery;
          setDeliveryData(initialData);

          const initialStatus = initialData.status === 'pending' ? 'searching' : initialData.status;
          setDeliveryStatus(initialStatus);

          if (initialStatus === 'searching') {
            searchTimerCleanup = startSearchTimer();
          }

          if (initialData.pickupLocation?.coordinates && initialData.dropoffLocation?.coordinates) {
            const pickupCoords = initialData.pickupLocation.coordinates;
            const dropoffCoords = initialData.dropoffLocation.coordinates;

            // Fetch actual route
            fetchRoute(pickupCoords, dropoffCoords);

            setMapRegion({
              latitude: (pickupCoords.latitude + dropoffCoords.latitude) / 2,
              longitude: (pickupCoords.longitude + dropoffCoords.longitude) / 2,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }

          unsubscribeDelivery = firestoreService.subscribeToDeliveryUpdates(
            deliveryId,
            handleDeliveryUpdate
          );
        } else {
          Alert.alert('Error', initialDeliveryResult.error || 'Failed to load delivery details.');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching delivery:', error);
        Alert.alert('Error', 'An unexpected error occurred while loading delivery.');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndSubscribeDelivery();

    return () => {
      unsubscribeDelivery();
      unsubscribeDriver();
      searchTimerCleanup();
    };
  }, [deliveryId, navigation, handleDeliveryUpdate, startSearchTimer]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
      case 'searching':
        return '#ff9800';
      case 'accepted':
      case 'picked_up':
      case 'in_transit':
      case 'arrived_dropoff':
        return '#2196f3';
      case 'delivered':
        return '#4caf50';
      case 'cancelled':
          
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
      case 'searching':
        return 'Looking for a driver';
      case 'accepted':
        return 'Driver Assigned';
      case 'arrived_pickup':
        return 'Driver at Pickup';
      case 'picked_up':
        return 'Package Picked Up';
      case 'in_transit':
        return 'Package In Transit';
      case 'arrived_dropoff':
        return 'Arrived at Destination';
      case 'delivered':
        return 'Package Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown Status';
    }
  };

  const getVehicleIcon = (vehicleType) => {
    switch (vehicleType) {
      case 'boda':
        return 'bicycle';
      case 'bajaji':
        return 'car';
      case 'guta':
        return 'truck';
      default:
        return 'car';
    }
  };

  const handleCallDriver = () => {
    if (driverInfo?.phoneNumber) {
      Linking.openURL(`tel:${driverInfo.phoneNumber}`);
    } else {
      Alert.alert('Error', 'Driver phone number not available.');
    }
  };

  const handleMessageDriver = () => {
    if (driverInfo?.phoneNumber) {
      Linking.openURL(`sms:${driverInfo.phoneNumber}`);
    } else {
      Alert.alert('Error', 'Driver phone number not available.');
    }
  };

  const handleViewReceipt = () => {
    navigation.navigate('Receipt', { deliveryId });
  };

  const formatSearchingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading || !deliveryData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading delivery details...</Text>
      </View>
    );
  }

  const pickupCoords = deliveryData.pickupLocation?.coordinates || {};
  const dropoffCoords = deliveryData.dropoffLocation?.coordinates || {};

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        mapType="standard"
        userInterfaceStyle="light"
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Pickup Marker */}
        {pickupCoords.latitude && pickupCoords.longitude && (
          <Marker
            coordinate={pickupCoords}
            title="Pickup"
            description={deliveryData.pickupLocation?.address}
          >
            <View style={[styles.markerContainer, { backgroundColor: '#0066cc' }]}>
              <Ionicons name="locate" size={16} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Dropoff Marker */}
        {dropoffCoords.latitude && dropoffCoords.longitude && (
          <Marker
            coordinate={dropoffCoords}
            title="Dropoff"
            description={deliveryData.dropoffLocation?.address}
          >
            <View style={[styles.markerContainer, { backgroundColor: '#ff6b6b' }]}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Driver Marker with rotation */}
        {driverLocation && driverLocation.latitude && driverLocation.longitude && (
          <Marker
            coordinate={driverLocation}
            rotation={driverLocation.heading || 0}
            anchor={{ x: 0.5, y: 0.5 }}
            title={driverInfo?.firstName || 'Driver'}
            description={`${driverInfo?.vehicleInfo?.vehicleType || ''} • ${driverInfo?.vehicleInfo?.vehiclePlate || ''}`}
          >
            <View style={styles.driverMarker}>
              <Ionicons
                name={getVehicleIcon(deliveryData.selectedVehicle?.id)}
                size={20}
                color="#fff"
              />
            </View>
          </Marker>
        )}

        {/* Actual Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#0066cc"
            lineDashPattern={[1, 0]}
          />
        )}

        {/* Driver's Traveled Path */}
        {driverPath.length > 1 && (
          <Polyline
            coordinates={driverPath}
            strokeWidth={3}
            strokeColor="#4CAF50"
          />
        )}

        {/* Fallback straight line if no route available */}
        {routeCoordinates.length === 0 && pickupCoords.latitude && dropoffCoords.latitude && (
          <Polyline
            coordinates={[pickupCoords, dropoffCoords]}
            strokeWidth={3}
            strokeColor="#0066cc"
            lineDashPattern={[2]}
          />
        )}
      </MapView>

      {/* Status Panel */}
      <View style={styles.statusPanel}>
        <View style={styles.deliveryHeader}>
          <View>
            <Text style={styles.deliveryId}>Order #{deliveryData.id?.substring(0, 8) || 'N/A'}</Text>
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
            <Text style={styles.eta}>{estimatedArrival || 'Calculating ETA...'}</Text>
          )}
        </View>

        {deliveryStatus === 'searching' && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.searchingText}>Searching for available drivers...</Text>
            <Text style={styles.searchingTime}>
              {formatSearchingTime(searchingTime)}
            </Text>
            <Text style={styles.searchingNote}>
              This usually takes 1-3 minutes
            </Text>
          </View>
        )}

        {driverInfo && deliveryStatus !== 'searching' && deliveryStatus !== 'delivered' && (
          <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <Image
                source={driverInfo.photoURL ? { uri: driverInfo.photoURL } : require('../../assets/driver.png')}
                style={styles.driverPhoto}
              />
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverInfo.firstName} {driverInfo.lastName}</Text>
                <View style={styles.driverRating}>
                  <Ionicons name="star" size={14} color="#ffc107" />
                  <Text style={styles.driverRatingText}>
                    {driverInfo.rating ? driverInfo.rating.toFixed(1) : '4.8'}
                  </Text>
                </View>
                <Text style={styles.vehicleInfo}>
                  {driverInfo.vehicleInfo?.vehicleType === 'boda' ? 'Boda Boda' :
                   driverInfo.vehicleInfo?.vehicleType === 'bajaji' ? 'Bajaji' :
                   driverInfo.vehicleInfo?.vehicleType === 'guta' ? 'Guta' : 'Unknown'} • {driverInfo.vehicleInfo?.licensePlate || 'N/A'}
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
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: getStatusColor(update.statusKey) }
                ]} />
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
  driverMarker: {
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
  searchingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 15,
  },
  searchingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  searchingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
    marginTop: 5,
  },
  searchingNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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