import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { validateConfig } from '@config/supabase.config';
import RootNavigator from '@navigation/RootNavigator';

export default function App() {
  useEffect(() => {
    if (!validateConfig()) {
      console.error('Invalid app configuration');
    }
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}
