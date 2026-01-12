import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const PackageDetailsScreen = ({ navigation }) => {
  const [packageDescription, setPackageDescription] = useState('');
  const [packageSize, setPackageSize] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const packageDescriptions = [
    { label: 'Documents', value: 'Documents' },
    { label: 'Food', value: 'Food' },
    { label: 'Clothing', value: 'Clothing' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Automotive Tools & Parts', value: 'Tools' },
    { label: 'Other', value: 'Other' },
  ];

  const packageSizes = [
    {
      id: 'small',
      label: 'Small',
      description: 'Up to 25kg',
      icon: 'cube-outline',
      color: '#0722B8',
    },
    {
      id: 'medium',
      label: 'Medium',
      description: '25kg to 75kg',
      icon: 'cube',
      color: '#059936',
    },
    {
      id: 'large',
      label: 'Large',
      description: '75kg and above',
      icon: 'apps-sharp',
      color: '#E81005',
    },
  ];

  const handleContinue = () => {
    if (!packageDescription.trim()) {
      alert('Please select a package description');
      return;
    }

    if (!packageSize) {
      alert('Please select a package size');
      return;
    }

    navigation.navigate('LocationSelection', {
      packageDetails: {
        description: packageDescription,
        size: packageSize,
        weight: packageSize, // Using size as weight reference
        specialInstructions: specialInstructions,
      },
    });
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}           // Important for Android
      extraScrollHeight={80}           // Fine-tune if needed (extra space above keyboard)
      extraHeight={120}                // Helps with multiline inputs
      resetScrollToCoords={{ x: 0, y: 0 }}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Package Details</Text>
        <Text style={styles.subtitle}>Tell us about your package</Text>

        {/* Package Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Package Type</Text>
          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={packageDescription}
              onValueChange={(itemValue) => setPackageDescription(itemValue)}
              style={styles.dropdown}
              dropdownIconColor="#666"
            >
              <Picker.Item label="Select Package Type..." value="" />
              {packageDescriptions.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Package Size Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Package Size</Text>
          <View style={styles.optionsContainer}>
            {packageSizes.map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.optionCard,
                  packageSize === size.id && styles.selectedOption,
                ]}
                onPress={() => setPackageSize(size.id)}
              >
                <Ionicons name={size.icon} size={24} color={size.color} />
                <Text
                  style={[
                    styles.optionLabel,
                    packageSize === size.id && styles.selectedOptionText,
                  ]}
                >
                  {size.label}
                </Text>
                <Text style={styles.optionDescription}>{size.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Special Instructions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Special Instructions (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Any special handling instructions?"
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <Text style={styles.charCount}>
            {specialInstructions.length}/300 characters
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Extra bottom padding */}
        <View style={{ height: 60 }} />
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 25,
    paddingBottom: 150,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdown: {
    width: '100%',
    height: 50,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    maxHeight: 180,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  optionCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: '#0066cc',
    backgroundColor: '#f0f7ff',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
  },
  selectedOptionText: {
    color: '#0066cc',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default PackageDetailsScreen;