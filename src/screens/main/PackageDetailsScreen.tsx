import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestoreService from'../../services/FirestoreService';
import { Picker } from '@react-native-picker/picker';

const PackageDetailsScreen = ({ navigation }) => {
  const [packageDescription, setPackageDescription] = useState('');
  const [packageSize, setPackageSize] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const packageDescriptions = [
    { label: 'Documents', value: 'Documents' },
    { label: 'Food', value: 'Food' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Clothing', value: 'Clothing' },
    { label: 'Other', value: 'Other' },
  ];

  const packageSizes = [
    { id: 'small', label: 'Small', description: 'Fits in a shoebox', icon: 'cube-outline' },
    { id: 'medium', label: 'Medium', description: 'Fits in a backpack', icon: 'cube' },
    { id: 'large', label: 'Large', description: 'Fits in a suitcase', icon: 'cube' },
  ];

  const packageWeights = [
    { id: 'light', label: 'Light', description: 'Up to 5kg', icon: 'barbell-outline' },
    { id: 'medium', label: 'Medium', description: '5-15kg', icon: 'barbell-outline' },
    { id: 'heavy', label: 'Heavy', description: 'Over 15kg', icon: 'barbell' },
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

    if (!packageWeight) {
      alert('Please select a package weight');
      return;
    }

    navigation.navigate('LocationSelection', {
      packageDetails: {
        description: packageDescription,
        size: packageSize,
        weight: packageWeight,
        specialInstructions: specialInstructions,
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
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
        {/* Rest of the code remains the same */}
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
                onPress={() => setPackageSize(size.id)}>
                <Ionicons
                  name={size.icon}
                  size={24}
                  color={packageSize === size.id ? '#0066cc' : '#666'}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    packageSize === size.id && styles.selectedOptionText,
                  ]}>
                  {size.label}
                </Text>
                <Text style={styles.optionDescription}>{size.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Package Weight Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Package Weight</Text>
          <View style={styles.optionsContainer}>
            {packageWeights.map((weight) => (
              <TouchableOpacity
                key={weight.id}
                style={[
                  styles.optionCard,
                  packageWeight === weight.id && styles.selectedOption,
                ]}
                onPress={() => setPackageWeight(weight.id)}>
                <Ionicons
                  name={weight.icon}
                  size={24}
                  color={packageWeight === weight.id ? '#0066cc' : '#666'}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    packageWeight === weight.id && styles.selectedOptionText,
                  ]}>
                  {weight.label}
                </Text>
                <Text style={styles.optionDescription}>{weight.description}</Text>
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
            maxLength={200}
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
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
    marginBottom: 24,
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
    height: 100,
    textAlignVertical: 'top',
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
    paddingVertical: 14,
    marginTop: 10,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default PackageDetailsScreen;