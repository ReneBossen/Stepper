import React from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Text, Button, useTheme } from 'react-native-paper';

interface SignOutDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Confirmation dialog for signing out of the app.
 */
export function SignOutDialog({
  visible,
  onDismiss,
  onConfirm,
  isLoading = false,
}: SignOutDialogProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        testID="sign-out-dialog"
      >
        <Dialog.Title>Sign Out</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Are you sure you want to sign out? You will need to sign in again to access your account.
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button
            onPress={onDismiss}
            disabled={isLoading}
            testID="sign-out-cancel"
            accessibilityLabel="Cancel sign out"
          >
            Cancel
          </Button>
          <Button
            onPress={onConfirm}
            loading={isLoading}
            disabled={isLoading}
            textColor={theme.colors.error}
            testID="sign-out-confirm"
            accessibilityLabel="Confirm sign out"
          >
            Sign Out
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
