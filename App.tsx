import React from 'react';
import MainNavigator from './src/navigation'; // Import your MainNavigator
import { View } from 'react-native';

function App(): React.JSX.Element {
    return (
      <View style={{ flex: 1 }}>
        <MainNavigator />
      </View>
    );
}

export default App;
