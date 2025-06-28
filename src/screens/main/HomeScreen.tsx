import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AuthService from '../../services/AuthService';
import FirestoreService from '../../services/FirestoreService';

type Location = {
  id: string;
  name: string;
  address: string;
  icon: string;
};

type Delivery = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  driverName: string;
  vehicleType: string;
  estimatedArrival: string;
  timeline?: {
    [key: string]: Date;
  };
};

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [recentLocations, setRecentLocations] = useState<Location[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // In the fetchData function, we'll get the user profile data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get current user from AuthService
      const currentUser = AuthService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // 2. Fetch user's profile data from Firestore
        const profileResponse = await FirestoreService.getUserProfile(currentUser.uid);
        if (profileResponse.success) {
          // Set the user profile data which includes the first name
          setUser(prev => ({ ...prev, ...profileResponse.userProfile }));

          // Also set recent locations if available
          if (profileResponse.userProfile?.recentLocations) {
            setRecentLocations(profileResponse.userProfile.recentLocations);
          }
        }

        // 3. Fetch active deliveries from Firestore
        const deliveriesResponse = await FirestoreService.getUserDeliveries(currentUser.uid);
        if (deliveriesResponse.success) {
          setActiveDeliveries(deliveriesResponse.deliveries.filter(
            (delivery: Delivery) => ['accepted', 'in_progress'].includes(delivery.status)
          ));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Navigation handlers
  const handleStartDelivery = useCallback(() => {
    navigation.navigate('PackageDetails');
  }, [navigation]);

  const handleTrackDelivery = useCallback((deliveryId: string) => {
    navigation.navigate('Tracking', { deliveryId });
  }, [navigation]);

  const handleLocationPress = useCallback((location: Location) => {
    navigation.navigate('LocationSelection', {
      selectedLocation: location,
    });
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    navigation.navigate('ProfileTab');
  }, [navigation]);

  // Format estimated arrival time
  const formatEstimatedArrival = (delivery: Delivery) => {
    if (!delivery.timeline?.accepted) return 'Calculating...';

    const acceptedTime = delivery.timeline.accepted.toDate();
    const estimatedTime = new Date(acceptedTime.getTime() + 15 * 60000); // Add 15 minutes
    const now = new Date();

    const diffMinutes = Math.round((estimatedTime.getTime() - now.getTime()) / 60000);
    return diffMinutes > 0 ? `~${diffMinutes} min` : 'Arriving soon';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#0066cc']}
        />
      }
    >
      {/* Header with greeting and profile */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Habari, {user?.firstName || user?.phoneNumber || 'Guest'}!
          </Text>
          <Text style={styles.subGreeting}>Ready to send a package?</Text>
        </View>
        <TouchableOpacity
          onPress={handleProfilePress}
          style={styles.profileButton}
        >
          <Image
            source={user?.photoURL ? { uri: user.photoURL } : require('../../assets/avatar-placeholder.jpg')}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {/* Active deliveries section */}
      {activeDeliveries.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Deliveries</Text>
          {activeDeliveries.map((delivery) => (
            <TouchableOpacity
              key={delivery.id}
              style={styles.activeDeliveryCard}
              onPress={() => handleTrackDelivery(delivery.id)}
            >
              <View style={styles.deliveryStatusContainer}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: delivery.status === 'accepted' ? '#FFA500' : '#4CAF50' }
                ]} />
                <Text style={styles.deliveryStatus}>
                  {delivery.status === 'accepted' ? 'Driver Assigned' : 'In Transit'}
                </Text>
              </View>
              <View style={styles.deliveryDetails}>
                <View style={styles.addressRow}>
                  <Ionicons name="locate" size={16} color="#0066cc" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {delivery.pickupAddress}
                  </Text>
                </View>
                <View style={styles.addressDivider} />
                <View style={styles.addressRow}>
                  <Ionicons name="location" size={16} color="#ff6b6b" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {delivery.dropoffAddress}
                  </Text>
                </View>
              </View>
              <View style={styles.deliveryFooter}>
                <View style={styles.driverInfo}>
                  <Ionicons
                    name={
                      delivery.vehicleType === 'Boda Boda'
                        ? 'bicycle'
                        : delivery.vehicleType === 'Tuk Tuk'
                        ? 'car'
                        : 'bus'
                    }
                    size={14}
                    color="#666"
                  />
                  <Text style={styles.driverText}>{delivery.driverName}</Text>
                </View>
                <View style={styles.etaContainer}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.etaText}>{formatEstimatedArrival(delivery)}</Text>
                </View>
              </View>
              <View style={styles.trackButtonContainer}>
                <Text style={styles.trackButtonText}>Track</Text>
                <Ionicons name="chevron-forward" size={16} color="#0066cc" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Active Deliveries</Text>
          <Text style={styles.emptyText}>You don't have any active deliveries</Text>
        </View>
      )}

      {/* Send package button */}
      <TouchableOpacity
        style={styles.sendButton}
        onPress={handleStartDelivery}
        activeOpacity={0.8}
      >
        <Ionicons name="cube-outline" size={24} color="#fff" />
        <Text style={styles.sendButtonText}>Send a Package</Text>
      </TouchableOpacity>

      {/* Recent locations section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Locations</Text>
        {recentLocations.length > 0 ? (
          recentLocations.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={styles.locationItem}
              onPress={() => handleLocationPress(location)}
            >
              <View style={styles.locationIcon}>
                <Ionicons name={location.icon || 'location-outline'} size={20} color="#0066cc" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationAddress}>{location.address}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent locations found</Text>
        )}
      </View>

      {/* Promotions section */}
      <View style={styles.promotionCard}>
        <View style={styles.promotionContent}>
          <Text style={styles.promotionTitle}>50% Off First Delivery!</Text>
          <Text style={styles.promotionDescription}>
            Use code WELCOME50 on your first package delivery
          </Text>
          <TouchableOpacity style={styles.promotionButton}>
            <Text style={styles.promotionButtonText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.promotionImageContainer}>
          <Ionicons name="gift-outline" size={60} color="#0066cc" />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },

  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    margin: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  activeDeliveryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 5,
  },
  deliveryStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
    marginRight: 6,
  },
  deliveryStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50',
  },
  deliveryDetails: {
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  addressDivider: {
    height: 10,
    width: 1,
    backgroundColor: '#ddd',
    marginLeft: 8,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 5,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  trackButtonContainer: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackButtonText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc',
    borderRadius: 10,
    padding: 15,
    margin: 15,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  locationAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  promotionCard: {
    flexDirection: 'row',
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 15,
    margin: 15,
    marginTop: 5,
    overflow: 'hidden',
  },
  promotionContent: {
    flex: 3,
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  promotionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  promotionButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  promotionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  promotionImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
