import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface GreetingHeaderProps {
  displayName: string;
}

// Refresh interval: 5 minutes in milliseconds
const GREETING_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Returns the appropriate greeting based on the current hour.
 */
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else {
    return 'Good Evening';
  }
};

/**
 * Displays a time-based greeting with the user's display name.
 * Changes greeting based on time of day:
 * - Morning: 5 AM - 12 PM
 * - Afternoon: 12 PM - 5 PM
 * - Evening: 5 PM - 5 AM
 *
 * Auto-refreshes every 5 minutes to update the greeting if the app
 * remains open across time boundaries.
 */
export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ displayName }) => {
  const theme = useTheme();
  const [greeting, setGreeting] = useState(getGreeting);

  const updateGreeting = useCallback(() => {
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    // Set up interval to refresh greeting every 5 minutes
    const intervalId = setInterval(updateGreeting, GREETING_REFRESH_INTERVAL_MS);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [updateGreeting]);

  const firstName = displayName.split(' ')[0];

  return (
    <View style={styles.container}>
      <Text
        variant="headlineMedium"
        style={[styles.greeting, { color: theme.colors.onBackground }]}
        accessibilityRole="header"
        accessibilityLabel={`${greeting}, ${firstName}`}
      >
        {greeting}, {firstName}!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greeting: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
