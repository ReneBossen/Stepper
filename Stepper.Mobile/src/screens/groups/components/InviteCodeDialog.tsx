import React from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Dialog, TextInput, Text, Button, useTheme } from 'react-native-paper';
import { INVITE_CODE } from '@utils/constants';

interface InviteCodeDialogProps {
  visible: boolean;
  inviteCode: string;
  inviteCodeError: string | null;
  isJoining: boolean;
  onChangeCode: (code: string) => void;
  onDismiss: () => void;
  onJoin: () => void;
}

export function InviteCodeDialog({
  visible,
  inviteCode,
  inviteCodeError,
  isJoining,
  onChangeCode,
  onDismiss,
  onJoin,
}: InviteCodeDialogProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Join with Invite Code</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Enter Invite Code"
            value={inviteCode}
            onChangeText={onChangeCode}
            mode="outlined"
            error={!!inviteCodeError}
            autoCapitalize="characters"
            maxLength={INVITE_CODE.MAX_LENGTH}
            testID="invite-code-input"
            accessibilityLabel="Invite code input"
          />
          {inviteCodeError && (
            <Text
              variant="bodySmall"
              style={[styles.errorText, { color: theme.colors.error }]}
            >
              {inviteCodeError}
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={onJoin}
            loading={isJoining}
            disabled={isJoining || !inviteCode.trim()}
            testID="join-with-code-button"
          >
            Join
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
