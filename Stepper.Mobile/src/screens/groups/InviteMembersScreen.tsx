import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import {
  Appbar,
  Text,
  Button,
  Divider,
  Checkbox,
  Avatar,
  useTheme,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { useGroupsStore } from '@store/groupsStore';
import { useFriendsStore, Friend } from '@store/friendsStore';
import { getErrorMessage } from '@utils/errorUtils';
import { getInitials } from '@utils/stringUtils';
import { INVITE_CODE } from '@utils/constants';
import type { GroupsStackScreenProps, GroupsStackParamList } from '@navigation/types';

type Props = GroupsStackScreenProps<'InviteMembers'>;
type NavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'InviteMembers'>;

interface FriendItemProps {
  friend: Friend;
  isSelected: boolean;
  onToggle: (userId: string) => void;
  isDisabled: boolean;
}

/**
 * Component for rendering a friend item with checkbox.
 */
function FriendItem({ friend, isSelected, onToggle, isDisabled }: FriendItemProps) {
  const theme = useTheme();

  const handlePress = useCallback(() => {
    if (!isDisabled) {
      onToggle(friend.user_id);
    }
  }, [friend.user_id, isDisabled, onToggle]);

  const accessibilityLabel = isDisabled
    ? `${friend.display_name}, already in group`
    : `${friend.display_name}, ${isSelected ? 'selected' : 'not selected'}`;

  return (
    <View
      style={[styles.friendItem, isDisabled && styles.friendItemDisabled]}
      accessibilityLabel={accessibilityLabel}
      testID={`friend-item-${friend.user_id}`}
    >
      <Checkbox
        status={isSelected ? 'checked' : 'unchecked'}
        onPress={handlePress}
        disabled={isDisabled}
        testID={`friend-checkbox-${friend.user_id}`}
      />

      {friend.avatar_url ? (
        <Avatar.Image size={40} source={{ uri: friend.avatar_url }} />
      ) : (
        <Avatar.Text
          size={40}
          label={getInitials(friend.display_name)}
          style={{ backgroundColor: theme.colors.primaryContainer }}
        />
      )}

      <View style={styles.friendInfo}>
        <Text
          variant="bodyMedium"
          style={{ color: isDisabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface }}
          numberOfLines={1}
        >
          {friend.display_name}
        </Text>
        {isDisabled && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Already in group
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Screen for inviting members to a group.
 * Includes invite code display, sharing options, and friend selection.
 */
export default function InviteMembersScreen({ route }: Props) {
  const { groupId } = route.params;
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const {
    inviteCode,
    members,
    isLoadingManagement,
    managementError,
    fetchInviteCode,
    generateInviteCode,
    fetchMembers,
    inviteFriends,
  } = useGroupsStore();

  const { friends, fetchFriends, isLoading: isLoadingFriends } = useFriendsStore();

  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Load data
  useEffect(() => {
    fetchInviteCode(groupId);
    fetchMembers(groupId);
    fetchFriends();
  }, [groupId, fetchInviteCode, fetchMembers, fetchFriends]);

  // Get existing member IDs
  const existingMemberIds = useMemo(() => {
    return new Set(members.map((m) => m.user_id));
  }, [members]);

  // Filter friends who are not already members
  const availableFriends = useMemo(() => {
    return friends.filter((f) => !existingMemberIds.has(f.user_id));
  }, [friends, existingMemberIds]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyCode = useCallback(async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      setSnackbarVisible(true);
    }
  }, [inviteCode]);

  const handleDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  const handleRetry = useCallback(() => {
    fetchInviteCode(groupId);
    fetchMembers(groupId);
    fetchFriends();
  }, [groupId, fetchInviteCode, fetchMembers, fetchFriends]);

  const handleGenerateNewCode = useCallback(async () => {
    Alert.alert(
      'Generate New Code',
      'This will invalidate the current invite code. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setIsGeneratingCode(true);
            try {
              await generateInviteCode(groupId);
              Alert.alert('Success', 'New invite code generated');
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            } finally {
              setIsGeneratingCode(false);
            }
          },
        },
      ]
    );
  }, [groupId, generateInviteCode]);

  const handleShare = useCallback(async () => {
    if (!inviteCode) return;

    try {
      const message = `Join my group on Stepper! Use invite code: ${inviteCode}`;
      await Share.share({
        message,
        title: 'Join my Stepper group',
      });
    } catch (error) {
      if ((error as Error).message !== 'User did not share') {
        Alert.alert('Error', getErrorMessage(error));
      }
    }
  }, [inviteCode]);

  const handleToggleFriend = useCallback((userId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleSendInvitations = useCallback(async () => {
    if (selectedFriends.size === 0) {
      Alert.alert('No Friends Selected', 'Please select at least one friend to invite.');
      return;
    }

    setIsSendingInvites(true);
    try {
      await inviteFriends(groupId, Array.from(selectedFriends));
      Alert.alert('Success', `Invited ${selectedFriends.size} friend${selectedFriends.size > 1 ? 's' : ''} to the group`);
      setSelectedFriends(new Set());
      // Refresh members list
      await fetchMembers(groupId);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSendingInvites(false);
    }
  }, [groupId, selectedFriends, inviteFriends, fetchMembers]);

  const renderFriendItem = useCallback(
    ({ item }: { item: Friend }) => {
      const isAlreadyMember = existingMemberIds.has(item.user_id);
      return (
        <FriendItem
          friend={item}
          isSelected={selectedFriends.has(item.user_id)}
          onToggle={handleToggleFriend}
          isDisabled={isAlreadyMember}
        />
      );
    },
    [selectedFriends, handleToggleFriend, existingMemberIds]
  );

  const keyExtractor = useCallback((item: Friend) => item.user_id, []);

  const ListHeaderComponent = useCallback(() => {
    return (
      <>
        {/* Invite Code Section */}
        <View style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Invite Code
          </Text>

          <View
            style={[
              styles.inviteCodeCard,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Text
              variant="headlineMedium"
              style={[styles.inviteCodeText, { color: theme.colors.onPrimaryContainer }]}
            >
              {inviteCode || '------'}
            </Text>

            <View style={styles.inviteCodeActions}>
              <Button
                mode="contained"
                icon="content-copy"
                onPress={handleCopyCode}
                disabled={!inviteCode}
                compact
                testID="copy-code-button"
                accessibilityLabel="Copy invite code to clipboard"
              >
                Copy Code
              </Button>
            </View>
          </View>

          <Text
            variant="bodySmall"
            style={[styles.validityText, { color: theme.colors.onSurfaceVariant }]}
          >
            Valid for {INVITE_CODE.VALIDITY_DAYS} days
          </Text>

          <Button
            mode="outlined"
            icon="refresh"
            onPress={handleGenerateNewCode}
            loading={isGeneratingCode}
            disabled={isGeneratingCode}
            style={styles.generateButton}
            testID="generate-new-code-button"
            accessibilityLabel="Generate new invite code"
          >
            Generate New Code
          </Button>
        </View>

        <Divider style={styles.divider} />

        {/* Share Link Section */}
        <View style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Share Link
          </Text>

          <Button
            mode="outlined"
            icon="share-variant"
            onPress={handleShare}
            disabled={!inviteCode}
            style={styles.shareButton}
            testID="share-button"
            accessibilityLabel="Share invite code"
          >
            Share via...
          </Button>
        </View>

        <Divider style={styles.divider} />

        {/* Invite Friends Section */}
        <View style={styles.section}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Invite Friends
          </Text>

          {isLoadingFriends && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
            </View>
          )}

          {!isLoadingFriends && friends.length === 0 && (
            <Text
              variant="bodyMedium"
              style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
            >
              You don't have any friends yet
            </Text>
          )}

          {!isLoadingFriends && friends.length > 0 && availableFriends.length === 0 && (
            <Text
              variant="bodyMedium"
              style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
            >
              All your friends are already in this group
            </Text>
          )}
        </View>
      </>
    );
  }, [
    inviteCode,
    isGeneratingCode,
    isLoadingFriends,
    friends.length,
    availableFriends.length,
    theme.colors,
    handleCopyCode,
    handleGenerateNewCode,
    handleShare,
  ]);

  const ListFooterComponent = useCallback(() => {
    if (availableFriends.length === 0) return null;

    return (
      <View style={styles.footerContainer}>
        <Button
          mode="contained"
          onPress={handleSendInvitations}
          loading={isSendingInvites}
          disabled={isSendingInvites || selectedFriends.size === 0}
          style={styles.sendButton}
          contentStyle={styles.sendButtonContent}
          testID="send-invitations-button"
          accessibilityLabel={`Send invitations to ${selectedFriends.size} friends`}
        >
          Send Invitations ({selectedFriends.size})
        </Button>
      </View>
    );
  }, [availableFriends.length, selectedFriends.size, isSendingInvites, handleSendInvitations]);

  // Loading state
  if (isLoadingManagement && !inviteCode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
          <Appbar.Content title="Invite Members" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  // Error state
  if (managementError && !inviteCode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
          <Appbar.Content title="Invite Members" />
        </Appbar.Header>
        <ErrorMessage message={managementError} onRetry={handleRetry} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
        <Appbar.Content title="Invite Members" />
      </Appbar.Header>

      <FlatList
        data={availableFriends}
        renderItem={renderFriendItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ItemSeparatorComponent={() => <Divider style={styles.itemDivider} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={handleDismissSnackbar}
        duration={2000}
        testID="copy-success-snackbar"
      >
        Invite code copied to clipboard
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
    marginBottom: 12,
  },
  inviteCodeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
  },
  inviteCodeText: {
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 16,
  },
  inviteCodeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  validityText: {
    textAlign: 'center',
    marginTop: 12,
  },
  generateButton: {
    marginTop: 16,
  },
  divider: {
    marginVertical: 8,
  },
  shareButton: {
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  friendItemDisabled: {
    opacity: 0.5,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemDivider: {
    marginLeft: 72,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sendButton: {
    borderRadius: 8,
  },
  sendButtonContent: {
    paddingVertical: 8,
  },
});
