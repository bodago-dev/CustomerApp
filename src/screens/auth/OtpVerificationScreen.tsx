import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import authService from '../../services/AuthService';

const OtpVerificationScreen = ({ route, navigation }) => {
  const { phoneNumber, verificationId } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const inputRefs = Array(6).fill(0).map(() => React.createRef());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearOtpAndRefocus = () => {
    setOtp(['', '', '', '', '', '']);
    setHasError(true);

    // Focus on the first input field after a brief delay
    setTimeout(() => {
      if (inputRefs[0] && inputRefs[0].current) {
        inputRefs[0].current.focus();
      }
    }, 100);
  };

  const handleOtpChange = (text, index) => {
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setHasError(false);

    // Auto-focus to next input
    if (text && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;

    setIsResending(true);
    setHasError(false);

    try {
      const result = await authService.sendOTP(phoneNumber);
      if (result.success) {
        Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
        setTimer(60);
        clearOtpAndRefocus();
      } else {
        Alert.alert('Error', result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Incomplete OTP', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setHasError(false);

    try {
      const result = await authService.verifyOTP(verificationId, otpCode);

      if (result.success) {
        if (result.isNewUser) {
          console.log('Navigating to UserProfile with phoneNumber:', phoneNumber);
          navigation.replace('UserProfile', {
            phoneNumber,
            verificationId
          });
        } else {
          console.log('Existing user verified. MainNavigator should handle navigation to MainTabs.');
        }
      } else {
          // Handle service-level error (like invalid verification code)
          console.log('Service-level error:', result.error);
          clearOtpAndRefocus();

          // Add a small delay to ensure UI updates before showing alert
          setTimeout(() => {
            Alert.alert('Invalid Code', result.error || 'The verification code is incorrect. Please try again.');
          }, 100);
     }
    } catch (error: any) {
      // Handle unexpected errors (network issues, etc.)
      console.error('Unexpected verification error:', error);
      clearOtpAndRefocus();
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Verification Code</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to {phoneNumber}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={inputRefs[index]}
              style={[
                styles.otpInput,
                hasError && styles.errorInput,
                isVerifying && styles.disabledInput
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!isVerifying}
              selectTextOnFocus={!isVerifying}
            />
          ))}
        </View>

        {hasError && (
          <Text style={styles.errorText}>
            Invalid code. Please try again.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, (isVerifying) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isVerifying}>
          <Text style={styles.buttonText}>
            {isVerifying ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity
            onPress={handleResendOtp}
            disabled={timer > 0 || isResending}>
            <Text
              style={[
                styles.resendButton,
                (timer > 0 || isResending) && styles.resendButtonDisabled
              ]}>
              {isResending
                ? 'Sending...'
                : timer > 0
                  ? `Resend in ${timer}s`
                  : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.changeNumber}
          onPress={() => navigation.goBack()}>
          <Text style={styles.changeNumberText}>
            Change Phone Number
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#fff',
  },
  errorInput: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff5f5',
  },
  disabledInput: {
    backgroundColor: '#f9f9f9',
    opacity: 0.7,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendButton: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#999',
  },
  changeNumber: {
    alignItems: 'center',
  },
  changeNumberText: {
    fontSize: 14,
    color: '#0066cc',
    textDecorationLine: 'underline',
  },
});

export default OtpVerificationScreen;