import * as React from 'react';
import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View, ActivityIndicator, Text } from 'react-native'; // ADD THESE IMPORTS
import { navigationRef } from '../services/NavigationService';
import authService from '../services/AuthService';

// Auth Screens
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import UserProfileScreen from '../screens/auth/UserProfileScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import PackageDetailsScreen from '../screens/main/PackageDetailsScreen';
import LocationSelectionScreen from '../screens/main/LocationSelectionScreen';
import VehicleSelectionScreen from '../screens/main/VehicleSelectionScreen';
import FareEstimationScreen from '../screens/main/FareEstimationScreen';
import PaymentScreen from '../screens/main/PaymentScreen';
import TrackingScreen from '../screens/main/TrackingScreen';
import DeliveryHistoryScreen from '../screens/main/DeliveryHistoryScreen';
import DeliveryDetailsScreen from '../screens/main/DeliveryDetailsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SupportScreen from '../screens/main/SupportScreen';

// Stack navigators
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const DeliveryStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const ProfileCompletionStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
      <AuthStack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <AuthStack.Screen name="UserProfile" component={UserProfileScreen} />
    </AuthStack.Navigator>
  );
};

// Profile completion navigator
const ProfileCompletionNavigator = () => {
  return (
    <ProfileCompletionStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileCompletionStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        initialParams={{ phoneNumber: authService.getCurrentUser()?.phoneNumber }}
        options={{
          title: 'Complete Your Profile',
          headerLeft: () => null,
          gestureEnabled: false
        }}
      />
    </ProfileCompletionStack.Navigator>
  );
};

// Delivery flow navigator
const DeliveryNavigator = () => {
  return (
    <DeliveryStack.Navigator>
      <DeliveryStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <DeliveryStack.Screen name="PackageDetails" component={PackageDetailsScreen} options={{ title: 'Package Details' }} />
      <DeliveryStack.Screen name="LocationSelection" component={LocationSelectionScreen} options={{ title: 'Select Locations' }} />
      <DeliveryStack.Screen name="VehicleSelection" component={VehicleSelectionScreen} options={{ title: 'Select Vehicle' }} />
      <DeliveryStack.Screen name="FareEstimation" component={FareEstimationScreen} options={{ title: 'Fare Estimate' }} />
      <DeliveryStack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <DeliveryStack.Screen name="Tracking" component={TrackingScreen} options={{ title: 'Track Delivery' }} />
      <DeliveryStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} options={{ title: 'Delivery Details' }} />
    </DeliveryStack.Navigator>
  );
};

// Profile navigator
const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <ProfileStack.Screen name="Support" component={SupportScreen} options={{ title: 'Help & Support' }} />
    </ProfileStack.Navigator>
  );
};

// Tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'DeliveryTab') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="DeliveryTab"
        component={DeliveryNavigator}
        options={{
          headerShown: false,
          title: 'Delivery'
        }}
      />
      <Tab.Screen
        name="History"
        component={DeliveryHistoryScreen}
        options={{
          title: 'History'
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          headerShown: false,
          title: 'Profile'
        }}
      />
    </Tab.Navigator>
  );
};

// Loading screen component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#0066cc" />
    <Text>Loading...</Text>
  </View>
);

// Main navigator
const MainNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const currentUser = authService.getCurrentUser();
      const currentProfile = authService.getCurrentUserProfile();

      setFirebaseUser(currentUser);
      setUserProfile(currentProfile);

      if (currentUser) {
        // Check if user has profile
        try {
          const profileExists = await authService.hasUserProfile();
          setHasProfile(profileExists);
        } catch (error) {
          console.error('Error checking profile:', error);
          setHasProfile(false);
        }
      } else {
        setHasProfile(false);
      }

      setIsLoading(false);
    };

    initializeAuth();

    const unsubscribe = authService.addAuthStateListener(async (user, profile) => {
      setFirebaseUser(user);
      setUserProfile(profile);

      if (user) {
        try {
          const profileExists = await authService.hasUserProfile();
          setHasProfile(profileExists);
        } catch (error) {
          console.error('Error checking profile:', error);
          setHasProfile(false);
        }
      } else {
        setHasProfile(false);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        {firebaseUser ? (
          // Use the hasProfile state to determine navigation
          hasProfile === true ? (
            <MainStack.Screen name="MainTabs" component={TabNavigator} />
          ) : hasProfile === false ? (
            <MainStack.Screen
              name="ProfileCompletion"
              component={ProfileCompletionNavigator}
              initialParams={{ phoneNumber: firebaseUser.phoneNumber }}
            />
          ) : (
            // Still loading profile check
            <MainStack.Screen name="Loading" component={LoadingScreen} />
          )
        ) : (
          <MainStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </MainStack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;