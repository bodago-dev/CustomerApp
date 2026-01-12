import React from 'react';
import MainNavigator from './src/navigation';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App(): React.JSX.Element {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MainNavigator />
      </GestureHandlerRootView >
    );
}

export default App;
