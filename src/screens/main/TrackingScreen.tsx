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
 import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
 import Ionicons from 'react-native-vector-icons/Ionicons';
 import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
 import locationService from '../../services/LocationService';
 import firestoreService from '../../services/FirestoreService';

 const TrackingScreen = ({ route, navigation }) => {
    const { deliveryId, packageDetails, pickupLocation, dropoffLocation, selectedVehicle, fareDetails } = route.params || {};
    const [isLoading, setIsLoading] = useState(true);
    const [deliveryStatus, setDeliveryStatus] = useState("searching");
    const [deliveryData, setDeliveryData] = useState(route.params?.delivery || {});
    const [driverInfo, setDriverInfo] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [customerLocation, setCustomerLocation] = useState(null);
    const [statusUpdates, setStatusUpdates] = useState([]);
    const [estimatedArrival, setEstimatedArrival] = useState('');
    const mapRef = useRef(null);
    const [unsubscribeDriver, setUnsubscribeDriver] = useState(null);
    const [unsubscribeDelivery, setUnsubscribeDelivery] = useState(null);

useEffect(() => {
    initializeTracking();

     return() => {
        cleanup();
     };
 },[]);

useEffect(() => {
     if(driverLocation && deliveryData){
        updateETA();
     }
 },[driverLocation, deliveryData]);


 // Update the initializeTracking function in TrackingScreen.tsx
 const initializeTracking = async () => {
   try {
     // First check and request location permissions
     const permissionStatus = await requestLocationPermission();

     if (!permissionStatus.granted) {
       Alert.alert(
         'Location Permission Required',
         'Please enable location permissions in settings to track your delivery',
         [
           {
             text: 'Cancel',
             onPress: () => navigation.goBack(),
             style: 'cancel',
           },
           {
             text: 'Open Settings',
             onPress: () => Linking.openSettings(),
           },
         ]
       );
       return;
     }

     // Get customer's current location
     const location = await locationService.getCurrentLocation();
     setCustomerLocation(location);

     // Rest of your existing initializeTracking code...
     // Subscribe to driver location updates
     if (deliveryData.driverId) {
       const unsubDriver = firestoreService.subscribeToDriverLocation(
         deliveryData.driverId,
         (location, error) => {
           if (error) {
             console.error('Error tracking driver:', error);
             return;
           }

           if (location) {
             setDriverLocation(location);
             // Animate map to show both driver and destination
             animateToShowBothLocations(location);
           }
         }
       );
       setUnsubscribeDriver(() => unsubDriver);
     }

     // Subscribe to delivery updates
     const unsubDelivery = firestoreService.subscribeToDeliveryUpdates(
       deliveryId,
       (delivery, error) => {
         if (error) {
           console.error('Error tracking delivery:', error);
           return;
         }
         if (delivery) {
           setDeliveryData(delivery);
           // Handle status changes
           handleDeliveryStatusChange(delivery.status);
         }
       }
     );
     setUnsubscribeDelivery(() => unsubDelivery);

   } catch (error) {
     console.error('Error initializing tracking:', error);
     Alert.alert('Error', 'Failed to initialize tracking');
   }
 };

 // Add this helper function to request permissions
 const requestLocationPermission = async () => {
   try {
     let permission;

     if (Platform.OS === 'ios') {
       permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
     } else {
       permission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
     }

     const result = await request(permission);

     switch (result) {
       case RESULTS.GRANTED:
         return { granted: true };
       case RESULTS.DENIED:
         return { granted: false };
       case RESULTS.BLOCKED:
         return { granted: false, blocked: true };
       default:
         return { granted: false };
     }
   } catch (error) {
     console.error('Error requesting location permission:', error);
     return { granted: false };
   }
 };

 const cleanup =()=> {
     if(unsubscribeDriver){
        unsubscribeDriver();
     }
     if(unsubscribeDelivery){
        unsubscribeDelivery();
     }
 };

 const updateETA =()=> {
     if(!driverLocation || !deliveryData) return;

     let destination;

     switch (deliveryData.status) {
         case 'accepted':
         case 'driver_en_route': destination=deliveryData.pickupLocation;
         break;
         case 'arrived_pickup':
         case 'package_picked_up':
         case 'in_transit': destination=deliveryData.dropoffLocation;
            break;
         default:
            return;
    }

     const etaData = locationService.calculateETA(driverLocation, destination);
     setEstimatedArrival(`${etaData.formattedTime} (${etaData.distance.toFixed(1)}km)`);
 };

 const animateToShowBothLocations = (driverLoc) => {
     if(!mapRef.current || !driverLoc) return;

     let coordinates = [driverLoc];

     if(deliveryData.status === 'accepted' || deliveryData.status === 'driver_en_route') {
        coordinates.push(deliveryData.pickupLocation);
     } else{
        coordinates.push(deliveryData.dropoffLocation);
     }
     mapRef.current.fitToCoordinates(coordinates,{
         edgePadding:{ top: 50, right: 50, bottom: 50,left: 50 },
         animated: true
     });
 };

 const handleDeliveryStatusChange = (status) => {
     switch (status) {
     case 'driver_en_route': Alert.alert('Update', 'Your driver is on the way to pickup location');
     break;
     case 'arrived_pickup': Alert.alert('Update', 'Your driver has arrived at pickup location');
     break;
     case' package_picked_up': Alert.alert('Update', 'Your package has been picked up and is on its way');
     break;
     case' in_transit': Alert.alert('Update', 'Your package is in transit to the destination');
     break;
     case' arrived_dropoff': Alert.alert('Update', 'Your driver has arrived at the dropoff location');
     break;
     case' delivered':
         Alert.alert('Delivery Complete', 'Your package has been delivered successfully');
         navigation.navigate('DeliveryComplete', { deliveryId, delivery:deliveryData });
     break;
     }
 };

 const callDriver = () => {
     if(deliveryData.driverPhone) {
        Linking.openURL(`tel:${deliveryData.driverPhone}`);
     }
 };

 const getStatusMessage = () => {
     switch (deliveryData.status) {
         case 'accepted':
            return 'Driver assigned to your delivery';
         case 'driver_en_route':
            return 'Driver is heading to pickup location';
         case 'arrived_pickup':
            return 'Driver has arrived at pickup location';
         case 'package_picked_up':
            return 'Package picked up successfully';
         case 'in_transit':
            return 'Package is on its way to destination';
         case 'arrived_dropoff':
            return 'Driver has arrived at dropoff location';
         default:
            return 'Tracking your delivery';
     }
 };

 const getMapRegion = () => {
     if(driverLocation) {
         return{
             latitude: driverLocation.latitude,
             longitude: driverLocation.longitude,
             latitudeDelta: 0.01,
             longitudeDelta: 0.01
         };
     } else if(customerLocation){
         return {
             latitude: customerLocation.latitude,
             longitude: customerLocation.longitude,
             latitudeDelta: 0.01,
             longitudeDelta: 0.01
         };
     }

     // Default to Dar es Salaam
     return {
         latitude: -6.7924,
         longitude: 39.2083,
         latitudeDelta: 0.1,
         longitudeDelta: 0.1
     };
 };

 return(
 <View style={styles.container}>
     <MapView
         ref={mapRef}
         style={styles.map}
         provider={PROVIDER_GOOGLE}
         initialRegion={getMapRegion()}
         showsUserLocation={true}
         showsMyLocationButton={true}
     >

 {/* Driver marker */}
 {driverLocation&&(
     <Marker
         coordinate={driverLocation}
         title="Your Driver"
         description={deliveryData.driverName||'Driver'}
         image={require('../../assets/driver-placeholder.jpg')}
     />
    )}

 {/* Pickup location marker */}
 <Marker
     coordinate={deliveryData.pickupLocation}
     title="Pickup Location"
     pinColor="green"
 />

 {/* Dropoff location marker */}
 <Marker
     coordinate={deliveryData.dropoffLocation}
     title="Dropoff Location"
     pinColor="red"
 />

 {/* Route polyline */}
 {driverLocation&&(
     <Polyline
         coordinates={[
             driverLocation,
             deliveryData.status === 'accepted' || deliveryData.status === 'driver_en_route'
             ?deliveryData.pickupLocation
             :deliveryData.dropoffLocation
         ]}
             strokeColor="#007bff"
             strokeWidth={3}
             lineDashPattern={[5,5]}
     />
 )}
 </MapView>

 <View style={styles.infoContainer}>
 <View style={styles.statusContainer}>
 <Text style={styles.statusText}>{getStatusMessage()}</Text>
 {estimatedArrival &&(
     <Text style={styles.etaText}>
        ETA: {estimatedArrival}
     </Text>
 )}
 </View>

 <View style={styles.driverInfo}>
     <Text style={styles.driverName}>
        {deliveryData.driverName||'Driver'}
     </Text>
     <Text style={styles.vehicleInfo}>
        {deliveryData.vehicleType}•{deliveryData.vehicleNumber}
     </Text>
 </View>

    <TouchableOpacity style={styles.callButton}onPress={callDriver}>
        <Text style={styles.callButtonText}>Call Driver</Text>
     </TouchableOpacity>
    </View>
 </View>
  );
 };

 const styles = StyleSheet.create({
     container:{
        flex: 1,
     },
     map:{
        flex: 1,
     },
     infoContainer:{
         position: 'absolute',
         bottom: 0,
         left: 0,
         right: 0,
         backgroundColor: '#fff',
         padding: 20,
         borderTopLeftRadius: 20,
         borderTopRightRadius: 20,
         shadowColor: '#000',
         shadowOffset: {width:0,height:-2},
         shadowOpacity: 0.1,
         shadowRadius: 4,
         elevation: 5,
     },
     statusContainer:{
        marginBottom: 15,
     },
     statusText:{
         fontSize: 16,
         fontWeight: '600',
         color: '#333',
         marginBottom: 5,
     },
     etaText:{
         fontSize: 14,
         color: '#666',
     },
     driverInfo:{
        marginBottom: 15,
     },
     driverName:{
         fontSize: 18,
         fontWeight: 'bold',
         color: '#333',
     },
     vehicleInfo:{
        fontSize: 14,
         color: '#666',
         marginTop: 2,
     },
     callButton:{
         backgroundColor: '#007bff',
         padding: 15,
         borderRadius: 8,
         alignItems: 'center',
     },
     callButtonText:{
         color: '#fff',
         fontSize: 16,
         fontWeight: '600',
     },
 });

 export default TrackingScreen;