import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  IconButton,
  HelperText,
  useTheme,
} from 'react-native-paper';

interface ChangePasswordModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (newPassword: string) => Promise<void>;
  isSaving?: boolean;
}

/**
 * Validates password meets requirements: min 8 chars, at least one letter and number.
 */
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

/**
 * Modal for changing the user's password.
 * Validates: min 8 chars, at least one letter and number.
 */
export function ChangePasswordModal({
  visible,
  onDismiss,
  onSave,
  isSaving = false,
}: ChangePasswordModalProps) {
  const theme = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setTouched({ newPassword: false, confirmPassword: false });
    }
  }, [visible]);

  const passwordError = touched.newPassword ? validatePassword(newPassword) : null;
  const confirmError =
    touched.confirmPassword && newPassword !== confirmPassword
      ? 'Passwords do not match'
      : null;

  const isValid =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    validatePassword(newPassword) === null &&
    newPassword === confirmPassword;

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    await onSave(newPassword);
  }, [isValid, newPassword, onSave]);

  const handleNewPasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, newPassword: true }));
  }, []);

  const handleConfirmPasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
  }, []);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Change Password
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="change-password-modal-close"
          />
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          Enter your new password. It must be at least 8 characters and contain at least one letter and one number.
        </Text>

        <TextInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          onBlur={handleNewPasswordBlur}
          secureTextEntry={!showNewPassword}
          mode="outlined"
          style={styles.input}
          testID="change-password-new-input"
          accessibilityLabel="New password"
          error={!!passwordError}
          right={
            <TextInput.Icon
              icon={showNewPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowNewPassword(!showNewPassword)}
              accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
            />
          }
        />
        {passwordError && (
          <HelperText type="error" visible testID="change-password-new-error">
            {passwordError}
          </HelperText>
        )}

        <TextInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={handleConfirmPasswordBlur}
          secureTextEntry={!showConfirmPassword}
          mode="outlined"
          style={styles.input}
          testID="change-password-confirm-input"
          accessibilityLabel="Confirm new password"
          error={!!confirmError}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
            />
          }
        />
        {confirmError && (
          <HelperText type="error" visible testID="change-password-confirm-error">
            {confirmError}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || !isValid}
          style={styles.saveButton}
          testID="change-password-save-button"
          accessibilityLabel="Save new password"
        >
          Change Password
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: '600',
  },
  description: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 8,
  },
});
