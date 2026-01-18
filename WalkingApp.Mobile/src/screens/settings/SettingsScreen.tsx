import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAuthStore } from '@store/authStore';
import { useAppTheme } from '@hooks/useAppTheme';

export default function SettingsScreen() {
  const { paperTheme } = useAppTheme();
  const signOut = useAuthStore((state) => state.signOut);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Settings
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Temporary logout for testing
      </Text>

      <Button
        mode="contained"
        onPress={handleLogout}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
        buttonColor={paperTheme.colors.error}
      >
        Logout
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
    opacity: 0.6,
  },
  button: {
    minWidth: 200,
  },
});
