import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { validateConfig } from '@config/supabase.config';

export default function App() {
  useEffect(() => {
    if (!validateConfig()) {
      console.error('Invalid app configuration');
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text>Walking App - Coming Soon!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
