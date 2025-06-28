 import React, { useState, useEffect, useRef } from 'react';
 import {
     View,
     Text,
     StyleSheet,
     Alert,
     TouchableOpacity,
     Linking
 } from 'react-native';

 import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native maps';
 import locationService from '../../services/LocationService';
 import firestoreService from '../../services/FirestoreService';

 const TrackingScreen = ({ route, navigation }) => {
 const{deliveryId,delivery}=route.params;
 const[driverLocation,setDriverLocation]=useState(null);
 const[customerLocation,setCustomerLocation]=useState(null);
 const[deliveryData,setDeliveryData]=useState(delivery);
 const[eta,setEta]=useState(null);
 constmapRef=useRef(null);
 const[unsubscribeDriver,setUnsubscribeDriver]=useState(null);
 const[unsubscribeDelivery,setUnsubscribeDelivery]=useState(null);
 useEffect(()=>{
initializeTracking();
 return()=>{
 cleanup();
 };
 },[]);
 useEffect(()=>{
 if(driverLocation&&deliveryData){
 updateETA();
 }
 },[driverLocation,deliveryData]);
 constinitializeTracking=async()=>{
 try{
 // Get customer's current location
 constlocation=awaitlocationService.getCurrentLocation();
 setCustomerLocation(location);
 // Subscribe to driver location updates
 if(deliveryData.driverId){
 constunsubDriver=firestoreService.subscribeToDriverLocation(
 deliveryData.driverId,
 (location,error)=>{
 if(error){
 console.error('Error tracking driver:',error);
 return;
 }
 if(location){
 setDriverLocation(location);
 // Animate map to show both driver and destination
 animateToShowBothLocations(location);
 }
 }
 );
 setUnsubscribeDriver(()=>unsubDriver);
 }
 // Subscribe to delivery updates
 constunsubDelivery=firestoreService.subscribeToDeliveryUpdates(
 deliveryId,
 (delivery,error)=>{
 if(error){
 console.error('Error tracking delivery:',error);
 return;
 }
 if(delivery){
 setDeliveryData(delivery);
// Handle status changes
 handleDeliveryStatusChange(delivery.status);
 }
 }
 );
 setUnsubscribeDelivery(()=>unsubDelivery);
 }catch(error){
 console.error('Error initializing tracking:',error);
 Alert.alert('Error', 'Failed to initialize tracking');
 }
 };
 constcleanup=()=>{
 if(unsubscribeDriver){
 unsubscribeDriver();
 }
 if(unsubscribeDelivery){
 unsubscribeDelivery();
 }
 };
 constupdateETA=()=>{
 if(!driverLocation||!deliveryData)return;
 letdestination;
 switch(deliveryData.status){
 case'accepted':
 case'driver_en_route':
 destination=deliveryData.pickupLocation;
 break;
 case'arrived_pickup':
 case'package_picked_up':
 case'in_transit':
 destination=deliveryData.dropoffLocation;
 break;
 default:
 return;
 }
 constetaData=locationService.calculateETA(driverLocation,destination);
 setEta(etaData);
 };
 constanimateToShowBothLocations=(driverLoc)=>{
 if(!mapRef.current||!driverLoc)return;
 letcoordinates=[driverLoc];
 if(deliveryData.status==='accepted'||deliveryData.status===
 'driver_en_route'){
coordinates.push(deliveryData.pickupLocation);
 }else{
 coordinates.push(deliveryData.dropoffLocation);
 }
 mapRef.current.fitToCoordinates(coordinates,{
 edgePadding:{top:50,right:50,bottom:50,left:50},
 animated:true
 });
 };
 consthandleDeliveryStatusChange=(status)=>{
 switch(status){
 case'driver_en_route':
 Alert.alert('Update', 'Your driver is on the way to pickup location');
 break;
 case'arrived_pickup':
 Alert.alert('Update', 'Your driver has arrived at pickup location');
 break;
 case'package_picked_up':
 Alert.alert('Update', 'Your package has been picked up and is on its way');
 break;
 case'in_transit':
 Alert.alert('Update', 'Your package is in transit to the destination');
 break;
 case'arrived_dropoff':
 Alert.alert('Update', 'Your driver has arrived at the dropoff location');
 break;
 case'delivered':
 Alert.alert('Delivery Complete', 'Your package has been delivered successfully');
 navigation.navigate('DeliveryComplete',{deliveryId,delivery:deliveryData});
 break;
 }
 };
 constcallDriver=()=>{
 if(deliveryData.driverPhone){
 Linking.openURL(`tel:${deliveryData.driverPhone}`);
 }
 };
 constgetStatusMessage=()=>{
 switch(deliveryData.status){
 case'accepted':
 return'Driver assigned to your delivery';
 case'driver_en_route':
 return'Driver is heading to pickup location';
 case'arrived_pickup':
 return'Driver has arrived at pickup location';
 case'package_picked_up':
 return'Package picked up successfully';
 case'in_transit':
return'Package is on its way to destination';
 case'arrived_dropoff':
 return'Driver has arrived at dropoff location';
 default:
 return'Tracking your delivery';
 }
 };
 constgetMapRegion=()=>{
 if(driverLocation){
 return{
 latitude:driverLocation.latitude,
 longitude:driverLocation.longitude,
 latitudeDelta:0.01,
 longitudeDelta:0.01
 };
 }elseif(customerLocation){
 return{
 latitude:customerLocation.latitude,
 longitude:customerLocation.longitude,
 latitudeDelta:0.01,
 longitudeDelta:0.01
 };
 }
 // Default to Dar es Salaam
 return{
 latitude:-6.7924,
 longitude:39.2083,
 latitudeDelta:0.1,
 longitudeDelta:0.1
 };
 };
 return(
 <Viewstyle={styles.container}>
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
 image={require('../../assets/driver-marker.png')}
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
 deliveryData.status==='accepted'||deliveryData.status===
 'driver_en_route'
 ?deliveryData.pickupLocation
 :deliveryData.dropoffLocation
 ]}
 strokeColor="#007bff"
 strokeWidth={3}
 lineDashPattern={[5,5]}
 />
 )}
 </MapView>
 <Viewstyle={styles.infoContainer}>
 <Viewstyle={styles.statusContainer}>
 <Textstyle={styles.statusText}>{getStatusMessage()}</Text>
 {eta&&(
 <Textstyle={styles.etaText}>
 ETA:{eta.formattedTime}({eta.distance.toFixed(1)}km)
 </Text>
 )}
 </View>
 <Viewstyle={styles.driverInfo}>
 <Textstyle={styles.driverName}>
 {deliveryData.driverName||'Driver'}
 </Text>
 <Textstyle={styles.vehicleInfo}>
 {deliveryData.vehicleType}•{deliveryData.vehicleNumber}
 </Text>
 </View>
<TouchableOpacitystyle={styles.callButton}onPress={callDriver}>
 <Textstyle={styles.callButtonText}>CallDriver</Text>
 </TouchableOpacity>
 </View>
 </View>
 );
 };
 conststyles=StyleSheet.create({
 container:{
 flex:1,
 },
 map:{
 flex:1,
 },
 infoContainer:{
 position: 'absolute',
 bottom:0,
 left:0,
 right:0,
 backgroundColor: '#fff',
 padding:20,
 borderTopLeftRadius:20,
 borderTopRightRadius:20,
 shadowColor: '#000',
 shadowOffset:{width:0,height:-2},
 shadowOpacity:0.1,
 shadowRadius:4,
 elevation:5,
 },
 statusContainer:{
 marginBottom:15,
 },
 statusText:{
 fontSize:16,
 fontWeight: '600',
 color: '#333',
 marginBottom:5,
 },
 etaText:{
 fontSize:14,
 color: '#666',
 },
 driverInfo:{
 marginBottom:15,
 },
 driverName:{
 fontSize:18,
 fontWeight: 'bold',
 color: '#333',
 },
 vehicleInfo:{
fontSize:14,
 color: '#666',
 marginTop:2,
 },
 callButton:{
 backgroundColor: '#007bff',
 padding:15,
 borderRadius:8,
 alignItems: 'center',
 },
 callButtonText:{
 color: '#fff',
 fontSize:16,
 fontWeight: '600',
 },
 });
 exportdefaultTrackingScreen;