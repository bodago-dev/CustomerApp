import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageStyle,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import authService from '../../services/AuthService';

// Define types for your navigation
type RootStackParamList = {
  OtpVerification: {
    verificationId: string; // Only pass the string ID instead of whole confirmation object
    phoneNumber: string;
  };
};

type PhoneAuthScreenProps = {
  navigation: {
    navigate: (screen: keyof RootStackParamList, params?: any) => void;
  };
};

const PhoneAuthScreen: React.FC<PhoneAuthScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {

    // Dismiss keyboard first
    Keyboard.dismiss();

    // Remove all non-digit characters
    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');

    if (!cleanedPhoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Check if the number starts with 0 and has 10 digits total
    if (cleanedPhoneNumber.startsWith('0') && cleanedPhoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number starting with 0');
      return;
    }

    // Check if the number doesn't start with 0 and has 9 digits
    if (!cleanedPhoneNumber.startsWith('0') && cleanedPhoneNumber.length !== 9) {
      Alert.alert('Error', 'Please enter a valid 9-digit phone number');
      return;
    }

    setIsLoading(true);

    try {
      let fullPhoneNumber;

      // Handle different input formats
      if (cleanedPhoneNumber.startsWith('0')) {
        // Convert local format (0712345678) to international (+255712345678)
        fullPhoneNumber = `+255${cleanedPhoneNumber.substring(1)}`;
      } else if (cleanedPhoneNumber.startsWith('255')) {
        // Convert national format (255712345678) to international (+255712345678)
        fullPhoneNumber = `+${cleanedPhoneNumber}`;
      } else if (cleanedPhoneNumber.startsWith('+255')) {
        // Already in international format
        fullPhoneNumber = cleanedPhoneNumber;
      } else {
        // Assume it's a 9-digit number without prefix
        fullPhoneNumber = `+255${cleanedPhoneNumber}`;
      }

      console.log('Formatted phone number:', fullPhoneNumber);

      const result = await authService.sendOTP(fullPhoneNumber);

      if (result.success) {
        navigation.navigate('OtpVerification', {
          verificationId: result.confirmation.verificationId,
          phoneNumber: fullPhoneNumber
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('OTP Error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Define styles with proper typing
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 15,
    },
    logo: {
      width: 180,
      height: 180,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginBottom: 30,
    },
    inputContainer: {
      marginBottom: 30,
    },
    phoneInputContainer: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      height: 50,
      alignItems: 'center',
      marginBottom: 8,
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
    input: {
      flex: 1,
      paddingHorizontal: 15,
      fontSize: 16,
      color: '#333',
    },
    helperText: {
      fontSize: 12,
      color: '#888',
      marginLeft: 5,
    },
    button: {
      backgroundColor: '#0066cc',
      borderRadius: 8,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    buttonDisabled: {
      backgroundColor: '#99ccff',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    languageSelector: {
      marginTop: 20,
      alignItems: 'center',
    },
    languageText: {
      fontSize: 14,
      color: '#666',
      marginBottom: 10,
    },
    languageOptions: {
      flexDirection: 'row',
    },
    languageOption: {
      marginHorizontal: 10,
    },
    languageOptionText: {
      fontSize: 14,
      color: '#666',
    },
    activeLanguage: {
      color: '#0066cc',
      fontWeight: 'bold',
      textDecorationLine: 'underline',
    },
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container as StyleProp<ViewStyle>}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer as StyleProp<ViewStyle>}
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.logoContainer as StyleProp<ViewStyle>}>
          <Image
            source={require('../../assets/BodaGo-Logo.png')}
            style={styles.logo as StyleProp<ImageStyle>}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title as StyleProp<TextStyle>}>Karibu! Welcome!</Text>
        <Text style={styles.subtitle as StyleProp<TextStyle>}>
          Enter your phone number to continue
        </Text>

        <View style={styles.inputContainer as StyleProp<ViewStyle>}>
          <View style={styles.phoneInputContainer as StyleProp<ViewStyle>}>
            <Text style={styles.countryCode as StyleProp<TextStyle>}>+255</Text>
            <TextInput
              style={styles.input as StyleProp<TextStyle>}
              placeholder="712 345 678 or 0712 345 678"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={(text) => {
                // Allow only digits and auto-format as user types
                const cleaned = text.replace(/\D/g, '');
                setPhoneNumber(cleaned);
              }}
              maxLength={10} // Allow up to 10 digits (for numbers starting with 0)
            />
          </View>
          <Text style={styles.helperText as StyleProp<TextStyle>}>
            Enter 9 digits (712345678) or 10 digits starting with 0 (0712345678)
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button as StyleProp<ViewStyle>,
            isLoading && (styles.buttonDisabled as StyleProp<ViewStyle>)
          ]}
          onPress={handleSendOTP}
          disabled={isLoading}>
          <Text style={styles.buttonText as StyleProp<TextStyle>}>
            {isLoading ? 'Sending...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <View style={styles.languageSelector as StyleProp<ViewStyle>}>
          <Text style={styles.languageText as StyleProp<TextStyle>}>Language / Lugha:</Text>
          <View style={styles.languageOptions as StyleProp<ViewStyle>}>
            <TouchableOpacity style={styles.languageOption as StyleProp<ViewStyle>}>
              <Text style={[
                styles.languageOptionText as StyleProp<TextStyle>,
                styles.activeLanguage as StyleProp<TextStyle>
              ]}>
                Swahili
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.languageOption as StyleProp<ViewStyle>}>
              <Text style={styles.languageOptionText as StyleProp<TextStyle>}>English</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default PhoneAuthScreen;