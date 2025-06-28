import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DeliveryHistoryScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [deliveries, setDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'completed'
  
  // Fetch delivery history
  useEffect(() => {
    // Simulate API call to fetch delivery history
    setTimeout(() => {
      const mockDeliveries = [
        {
          id: 'DEL1001',
          status: 'delivered',
          date: '2025-06-05',
          time: '14:30',
          pickupAddress: 'Home, 123 Uhuru Street',
          dropoffAddress: 'Mlimani City Mall',
          packageSize: 'small',
          vehicleType: 'boda',
          amount: 4500,
          driverName: 'John M.',
          rating: 5,
        },
        {
          id: 'DEL1002',
          status: 'in_transit',
          date: '2025-06-07',
          time: '10:15',
          pickupAddress: 'Office, 456 Samora Avenue',
          dropoffAddress: 'Julius Nyerere International Airport',
          packageSize: 'medium',
          vehicleType: 'tuktuk',
          amount: 6500,
          driverName: 'Sarah N.',
          rating: null,
        },
        {
          id: 'DEL1003',
          status: 'delivered',
          date: '2025-06-02',
          time: '09:45',
          pickupAddress: 'Home, 123 Uhuru Street',
          dropoffAddress: 'Kariakoo Market',
          packageSize: 'small',
          vehicleType: 'boda',
          amount: 3500,
          driverName: 'David L.',
          rating: 4,
        },
        {
          id: 'DEL1004',
          status: 'cancelled',
          date: '2025-05-30',
          time: '16:20',
          pickupAddress: 'Office, 456 Samora Avenue',
          dropoffAddress: 'Coco Beach',
          packageSize: 'large',
          vehicleType: 'van',
          amount: 0,
          driverName: null,
          rating: null,
        },
        {
          id: 'DEL1005',
          status: 'delivered',
          date: '2025-05-28',
          time: '11:10',
          pickupAddress: 'Home, 123 Uhuru Street',
          dropoffAddress: 'University of Dar es Salaam',
          packageSize: 'medium',
          vehicleType: 'tuktuk',
          amount: 5500,
          driverName: 'Michael K.',
          rating: 5,
        },
      ];
      
      setDeliveries(mockDeliveries);
      setIsLoading(false);
    }, 1500);
  }, []);

  // Filter deliveries based on active tab
  const filteredDeliveries = deliveries.filter(delivery => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['accepted', 'arrived_pickup', 'picked_up', 'in_transit', 'arrived_dropoff'].includes(delivery.status);
    if (activeTab === 'completed') return delivery.status === 'delivered';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return '#4caf50';
      case 'in_transit':
      case 'accepted':
      case 'arrived_pickup':
      case 'picked_up':
      case 'arrived_dropoff':
        return '#2196f3';
      case 'cancelled':
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'in_transit':
        return 'In Transit';
      case 'accepted':
        return 'Driver Assigned';
      case 'arrived_pickup':
        return 'Driver at Pickup';
      case 'picked_up':
        return 'Picked Up';
      case 'arrived_dropoff':
        return 'At Destination';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing';
    }
  };

  const getVehicleIcon = (vehicleType) => {
    switch (vehicleType) {
      case 'boda':
        return 'bicycle-outline';
      case 'tuktuk':
        return 'car-outline';
      case 'van':
        return 'car-sport-outline';
      default:
        return 'cube-outline';
    }
  };

  const formatPrice = (price) => {
    return `TZS ${price.toLocaleString()}`;
  };

  const handleDeliveryPress = (delivery) => {
    if (['accepted', 'arrived_pickup', 'picked_up', 'in_transit', 'arrived_dropoff'].includes(delivery.status)) {
      // Navigate to tracking screen for active deliveries
      navigation.navigate('Tracking', { deliveryId: delivery.id });
    } else if (delivery.status === 'delivered') {
      // Show delivery details for completed deliveries
      navigation.navigate('DeliveryDetails', { deliveryId: delivery.id });
    }
  };

  const renderDeliveryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.deliveryCard}
      onPress={() => handleDeliveryPress(item)}>
      <View style={styles.deliveryHeader}>
        <View style={styles.deliveryIdContainer}>
          <Text style={styles.deliveryId}>{item.id}</Text>
          <Text style={styles.deliveryDate}>{item.date} • {item.time}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusIndicator, 
              { backgroundColor: getStatusColor(item.status) }
            ]} 
          />
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.deliveryDetails}>
        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <Ionicons name="locate" size={16} color="#0066cc" />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.pickupAddress}
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
            {item.dropoffAddress}
          </Text>
        </View>
      </View>
      
      <View style={styles.deliveryFooter}>
        <View style={styles.packageInfo}>
          <Ionicons name={getVehicleIcon(item.vehicleType)} size={16} color="#666" />
          <Text style={styles.packageInfoText}>
            {item.vehicleType === 'boda' ? 'Boda Boda' : 
             item.vehicleType === 'tuktuk' ? 'Tuk Tuk' : 'Van'} • 
            {item.packageSize === 'small' ? ' Small' : 
             item.packageSize === 'medium' ? ' Medium' : ' Large'} package
          </Text>
        </View>
        
        {item.status !== 'cancelled' && (
          <Text style={styles.deliveryAmount}>{formatPrice(item.amount)}</Text>
        )}
      </View>
      
      {item.status === 'delivered' && item.rating && (
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>Your Rating:</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons 
                key={star}
                name={star <= item.rating ? "star" : "star-outline"} 
                size={16} 
                color="#ffc107" 
              />
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}>
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'all' && styles.activeTabText
            ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}>
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'active' && styles.activeTabText
            ]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}>
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'completed' && styles.activeTabText
            ]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Loading delivery history...</Text>
        </View>
      ) : filteredDeliveries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No deliveries found</Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'all' 
              ? 'You haven\'t made any deliveries yet'
              : activeTab === 'active'
                ? 'You don\'t have any active deliveries'
                : 'You don\'t have any completed deliveries'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          renderItem={renderDeliveryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 5,
  },
  activeTab: {
    backgroundColor: '#e6f2ff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0066cc',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  deliveryCard: {
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
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deliveryIdContainer: {
    flex: 1,
  },
  deliveryId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  deliveryDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#666',
  },
  deliveryDetails: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  locationIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  routeDivider: {
    paddingLeft: 12,
    height: 10,
  },
  routeDividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#ddd',
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageInfoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  deliveryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ratingLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
});

export default DeliveryHistoryScreen;
