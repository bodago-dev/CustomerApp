import React, { useState, useEffect } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import authService from '../../services/AuthService';
import NetInfo from '@react-native-community/netinfo';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Define types for your navigation
type RootStackParamList = {
  OtpVerification: {
    verificationId: string;
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
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [inputError, setInputError] = useState(false);

  // Check network connection on mount and listen for changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);

      // Clear network error when connection is restored
      if (state.isConnected && networkError?.includes('internet')) {
        setNetworkError(null);
      }
    });

    // Initial network state check
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, [networkError]);

  // Clear error when user starts typing
  useEffect(() => {
    if (networkError || inputError) {
      setNetworkError(null);
      setInputError(false);
    }
  }, [phoneNumber]);

  const handleSendOTP = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();

    // Clear any existing errors
    setNetworkError(null);
    setInputError(false);

    // Remove all non-digit characters
    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');

    if (!cleanedPhoneNumber.trim()) {
      setNetworkError('Please enter your phone number');
      setInputError(true);
      return;
    }

    // Check if the number starts with 0 and has 10 digits total
    if (cleanedPhoneNumber.startsWith('0') && cleanedPhoneNumber.length !== 10) {
      setNetworkError('Please enter a valid 10-digit phone number starting with 0');
      setInputError(true);
      return;
    }

    // Check if the number doesn't start with 0 and has 9 digits
    if (!cleanedPhoneNumber.startsWith('0') && cleanedPhoneNumber.length !== 9) {
      setNetworkError('Please enter a valid 9-digit phone number');
      setInputError(true);
      return;
    }

    // Check internet connection before proceeding
    if (!isConnected) {
      setNetworkError('No internet connection. Please check your network and try again.');
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
        // Map Firebase error codes to user-friendly messages
        let userFriendlyError = result.error || 'Failed to send OTP. Please try again.';

        if (result.error) {
          if (result.error.includes('network') || result.error.includes('Network') || result.error.includes('timeout')) {
            userFriendlyError = 'Network error. Please check your internet connection.';
          } else if (result.error.includes('quota') || result.error.includes('too-many-requests')) {
            userFriendlyError = 'Too many attempts. Please try again later.';
          } else if (result.error.includes('invalid-phone-number')) {
            userFriendlyError = 'Invalid phone number format.';
          }
        }

        setNetworkError(userFriendlyError);

        // Set input error for invalid phone number
        if (result.error.includes('invalid-phone-number')) {
          setInputError(true);
        }
      }
    } catch (error: any) {
      console.error('OTP Error:', error);

      let userFriendlyError = 'Failed to send OTP. Please try again.';

      // Handle specific error types
      if (error.message?.includes('network') || error.message?.includes('Network') || error.code === 'auth/network-request-failed') {
        userFriendlyError = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/too-many-requests') {
        userFriendlyError = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-phone-number') {
        userFriendlyError = 'Invalid phone number format.';
        setInputError(true);
      }

      setNetworkError(userFriendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when user starts typing
  const handlePhoneNumberChange = (text: string) => {
    // Allow only digits and auto-format as user types
    const cleaned = text.replace(/\D/g, '');
    setPhoneNumber(cleaned);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Banner */}
          {networkError && (
            <View style={styles.errorBanner}>
              <View style={styles.errorContent}>
                <Ionicons name="warning-outline" size={20} color="#fff" />
                <Text style={styles.errorText} numberOfLines={2}>{networkError}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setNetworkError(null)}
                style={styles.closeErrorButton}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/BodaGo-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Karibu! Welcome!</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to continue
          </Text>

          <View style={styles.inputContainer}>
            <View style={[
              styles.phoneInputContainer,
              inputError && styles.phoneInputContainerError
            ]}>
              <Text style={styles.countryCode}>+255</Text>
              <TextInput
                style={styles.input}
                placeholder="712 345 678 or 0712 345 678"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                maxLength={10} // Allow up to 10 digits (for numbers starting with 0)
                editable={!isLoading}
              />
            </View>
            <Text style={styles.helperText}>
              Enter 9 digits (712345678) or 10 digits starting with 0 (0712345678)
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (isLoading || !isConnected) && styles.buttonDisabled
            ]}
            onPress={handleSendOTP}
            disabled={isLoading || !isConnected}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Sending...' : 'Continue'}
            </Text>
          </TouchableOpacity>

          {/* Network Status Indicator */}
          {!isConnected && !networkError && (
            <View style={styles.networkStatus}>
              <Ionicons name="wifi-outline" size={16} color="#ff9800" />
              <Text style={styles.networkStatusText}>
                You are offline. Please connect to the internet.
              </Text>
            </View>
          )}

          <View style={styles.languageSelector}>
            <Text style={styles.languageText}>Language / Lugha:</Text>
            <View style={styles.languageOptions}>
              <TouchableOpacity style={styles.languageOption}>
                <Text style={[
                  styles.languageOptionText,
                  styles.activeLanguage
                ]}>
                  Swahili
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.languageOption}>
                <Text style={styles.languageOptionText}>English</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

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
  // Error Banner Styles
  errorBanner: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 20,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  closeErrorButton: {
    padding: 4,
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
  phoneInputContainerError: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
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
  // Network Status Indicator
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  networkStatusText: {
    fontSize: 14,
    color: '#ff9800',
    marginLeft: 8,
    fontWeight: '500',
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

export default PhoneAuthScreen;