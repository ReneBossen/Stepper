import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { List, useTheme } from 'react-native-paper';
import type { MutualGroup } from '@store/userStore';

interface MutualGroupItemProps {
  group: MutualGroup;
  onPress?: (group: MutualGroup) => void;
  testID?: string;
}

/**
 * Displays a mutual group item in a list.
 */
export function MutualGroupItem({ group, onPress, testID }: MutualGroupItemProps) {
  const theme = useTheme();

  const handlePress = () => {
    onPress?.(group);
  };

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      testID={testID}
      accessibilityLabel={`Mutual group: ${group.name}`}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <List.Item
        title={group.name}
        left={(props) => (
          <List.Icon
            {...props}
            icon="trophy"
            color={theme.colors.primary}
          />
        )}
        right={onPress ? (props) => (
          <List.Icon
            {...props}
            icon="chevron-right"
            color={theme.colors.onSurfaceVariant}
          />
        ) : undefined}
        style={styles.item}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 4,
  },
});
