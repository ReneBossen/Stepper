import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Appbar,
  TextInput,
  Text,
  Switch,
  Button,
  Divider,
  IconButton,
  useTheme,
  HelperText,
  Snackbar,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { useGroupsStore } from '@store/groupsStore';
import { getErrorMessage } from '@utils/errorUtils';
import { getCompetitionTypeLabelFull } from '@utils/groupUtils';
import { INVITE_CODE } from '@utils/constants';
import type { GroupsStackScreenProps, GroupsStackParamList } from '@navigation/types';

type Props = GroupsStackScreenProps<'GroupManagement'>;
type NavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'GroupManagement'>;

/**
 * Group Management/Settings screen for owners and admins.
 * Allows editing group details, privacy settings, and deleting the group.
 */
export default function GroupManagementScreen({ route }: Props) {
  const { groupId } = route.params;
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const {
    managementGroup,
    inviteCode,
    isLoadingManagement,
    managementError,
    fetchGroupDetails,
    fetchInviteCode,
    updateGroup,
    deleteGroup,
    clearManagementState,
  } = useGroupsStore();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [maxMembers, setMaxMembers] = useState('5');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Validation state
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Load group data
  useEffect(() => {
    fetchGroupDetails(groupId);
    fetchInviteCode(groupId);
  }, [groupId, fetchGroupDetails, fetchInviteCode]);

  // Cleanup on unmount
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearManagementState();
      };
    }, [clearManagementState])
  );

  // Populate form when data loads
  useEffect(() => {
    if (managementGroup) {
      setName(managementGroup.name);
      setDescription(managementGroup.description || '');
      setIsPrivate(managementGroup.is_private);
      setRequireApproval(managementGroup.require_approval);
      setMaxMembers(String(managementGroup.max_members ?? 5));
      setHasChanges(false);
    }
  }, [managementGroup]);

  const validateName = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setNameError('Group name is required');
      return false;
    }
    if (value.trim().length < 3) {
      setNameError('Group name must be at least 3 characters');
      return false;
    }
    if (value.trim().length > 50) {
      setNameError('Group name must be at most 50 characters');
      return false;
    }
    setNameError(null);
    return true;
  }, []);

  const validateDescription = useCallback((value: string): boolean => {
    if (value.length > 500) {
      setDescriptionError('Description must be at most 500 characters');
      return false;
    }
    setDescriptionError(null);
    return true;
  }, []);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setHasChanges(true);
    if (nameError) {
      validateName(value);
    }
  }, [nameError, validateName]);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    setHasChanges(true);
    if (descriptionError) {
      validateDescription(value);
    }
  }, [descriptionError, validateDescription]);

  const handlePrivateChange = useCallback((value: boolean) => {
    setIsPrivate(value);
    setHasChanges(true);
  }, []);

  const handleRequireApprovalChange = useCallback((value: boolean) => {
    setRequireApproval(value);
    setHasChanges(true);
  }, []);

  const handleMaxMembersChange = useCallback((value: string) => {
    setMaxMembers(value);
    setHasChanges(true);
  }, []);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [hasChanges, navigation]);

  const handleSave = useCallback(async () => {
    const isNameValid = validateName(name);
    const isDescriptionValid = validateDescription(description);

    if (!isNameValid || !isDescriptionValid) {
      return;
    }

    const parsedMaxMembers = parseInt(maxMembers, 10) || 5;
    if (parsedMaxMembers < 1 || parsedMaxMembers > 50) {
      Alert.alert('Error', 'Max members must be between 1 and 50');
      return;
    }

    setIsSaving(true);
    try {
      await updateGroup(groupId, {
        name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
        require_approval: requireApproval,
        max_members: parsedMaxMembers,
      });
      setHasChanges(false);
      Alert.alert('Success', 'Group settings saved successfully');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [groupId, name, description, isPrivate, requireApproval, maxMembers, validateName, validateDescription, updateGroup]);

  const handleCopyInviteCode = useCallback(async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      setSnackbarVisible(true);
    }
  }, [inviteCode]);

  const handleDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  const handleManageMembers = useCallback(() => {
    navigation.navigate('ManageMembers', { groupId });
  }, [groupId, navigation]);

  const handleInviteMembers = useCallback(() => {
    navigation.navigate('InviteMembers', { groupId });
  }, [groupId, navigation]);

  const handleDeleteGroup = useCallback(() => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone and all members will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteGroup(groupId);
              // Navigate back to groups list
              navigation.popToTop();
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [groupId, deleteGroup, navigation]);

  const handleRetry = useCallback(() => {
    fetchGroupDetails(groupId);
    fetchInviteCode(groupId);
  }, [groupId, fetchGroupDetails, fetchInviteCode]);

  // Loading state
  if (isLoadingManagement && !managementGroup) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
          <Appbar.Content title="Group Settings" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  // Error state
  if (managementError && !managementGroup) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
          <Appbar.Content title="Group Settings" />
        </Appbar.Header>
        <ErrorMessage message={managementError} onRetry={handleRetry} />
      </View>
    );
  }

  const isOwner = managementGroup?.user_role === 'owner';
  const competitionTypeLabel = managementGroup
    ? getCompetitionTypeLabelFull(managementGroup.competition_type)
    : '';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
        <Appbar.Content title="Group Settings" />
        {hasChanges && (
          <Appbar.Action
            icon="content-save"
            onPress={handleSave}
            disabled={isSaving}
            color="#4CAF50"
            accessibilityLabel="Save changes"
          />
        )}
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Icon/Avatar */}
          <View style={styles.avatarSection}>
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text style={styles.avatarEmoji}>{'\u{1F3C6}'}</Text>
            </View>
            <Text
              variant="titleLarge"
              style={[styles.groupName, { color: theme.colors.onSurface }]}
            >
              {managementGroup?.name}
            </Text>
          </View>

          <Divider style={styles.divider} />

          {/* Details Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Details
            </Text>

            <TextInput
              label="Group Name *"
              value={name}
              onChangeText={handleNameChange}
              mode="outlined"
              style={styles.input}
              error={!!nameError}
              maxLength={50}
              testID="group-name-input"
              accessibilityLabel="Group name input"
            />
            <HelperText type="error" visible={!!nameError}>
              {nameError}
            </HelperText>

            <TextInput
              label="Description (optional)"
              value={description}
              onChangeText={handleDescriptionChange}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              error={!!descriptionError}
              maxLength={500}
              testID="group-description-input"
              accessibilityLabel="Group description input"
            />
            <HelperText type="info" visible={!descriptionError}>
              {description.length}/500 characters
            </HelperText>
          </View>

          <Divider style={styles.divider} />

          {/* Competition Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Competition
            </Text>
            <View style={[styles.readOnlyField, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Type: {competitionTypeLabel}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                Competition type cannot be changed after group creation
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Privacy Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Privacy
            </Text>

            <View style={styles.switchRow} testID="private-switch-container">
              <View style={styles.switchLabel}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Private Group
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Only people with invite code can join
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={handlePrivateChange}
                testID="private-switch"
                accessibilityLabel={`Private group toggle, currently ${isPrivate ? 'enabled' : 'disabled'}`}
              />
            </View>

            <View style={styles.switchRow} testID="approval-switch-container">
              <View style={styles.switchLabel}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Require Admin Approval
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  New members must be approved by an admin
                </Text>
              </View>
              <Switch
                value={requireApproval}
                onValueChange={handleRequireApprovalChange}
                testID="approval-switch"
                accessibilityLabel={`Require admin approval toggle, currently ${requireApproval ? 'enabled' : 'disabled'}`}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Max Members Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Max Members
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
            >
              Maximum number of members allowed (1-50)
            </Text>
            <Slider
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={parseInt(maxMembers, 10) || 5}
              onValueChange={(value: number) => {
                const rounded = String(Math.round(value));
                setMaxMembers(rounded);
                setHasChanges(true);
              }}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.surfaceVariant}
              thumbTintColor={theme.colors.primary}
              style={styles.slider}
              testID="max-members-slider"
              accessibilityLabel="Maximum members slider"
            />
            <TextInput
              label="Max Members"
              value={maxMembers}
              onChangeText={(text: string) => {
                const numeric = text.replace(/[^0-9]/g, '');
                setMaxMembers(numeric);
                setHasChanges(true);
              }}
              mode="outlined"
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              testID="max-members-input"
              accessibilityLabel="Maximum members input"
            />
          </View>

          <Divider style={styles.divider} />

          {/* Invite Code Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Invite Code
            </Text>

            <View style={[styles.inviteCodeContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text
                variant="headlineSmall"
                style={[styles.inviteCodeText, { color: theme.colors.onSurface }]}
              >
                {inviteCode || 'No code generated'}
              </Text>
              {inviteCode && (
                <IconButton
                  icon="content-copy"
                  onPress={handleCopyInviteCode}
                  testID="copy-invite-code-button"
                  accessibilityLabel="Copy invite code to clipboard"
                />
              )}
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Members Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Members
            </Text>

            <Button
              mode="outlined"
              icon="account-group"
              onPress={handleManageMembers}
              style={styles.memberButton}
              testID="manage-members-button"
              accessibilityLabel={`Manage members, ${managementGroup?.member_count || 0} members`}
            >
              Manage Members ({managementGroup?.member_count || 0})
            </Button>

            <Button
              mode="outlined"
              icon="account-plus"
              onPress={handleInviteMembers}
              style={styles.memberButton}
              testID="invite-members-button"
              accessibilityLabel="Invite members"
            >
              Invite Members
            </Button>
          </View>

          {/* Danger Zone (Owner Only) */}
          {isOwner && (
            <>
              <Divider style={styles.divider} />

              <View style={styles.section}>
                <Text
                  variant="titleSmall"
                  style={[styles.sectionTitle, { color: theme.colors.error }]}
                >
                  Danger Zone
                </Text>

                <Button
                  mode="outlined"
                  icon="delete"
                  onPress={handleDeleteGroup}
                  loading={isDeleting}
                  disabled={isDeleting}
                  textColor={theme.colors.error}
                  style={[styles.deleteButton, { borderColor: theme.colors.error }]}
                  testID="delete-group-button"
                  accessibilityLabel="Delete group"
                >
                  Delete Group
                </Button>
              </View>
            </>
          )}

          {/* Save Button */}
          {hasChanges && (
            <View style={styles.saveButtonContainer}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={isSaving}
                disabled={isSaving}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
                testID="save-settings-button"
                accessibilityLabel="Save changes"
              >
                Save Changes
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  groupName: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
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
  input: {
    marginBottom: 4,
  },
  slider: {
    marginBottom: 8,
  },
  readOnlyField: {
    padding: 16,
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
  },
  inviteCodeText: {
    fontWeight: '600',
    letterSpacing: 2,
  },
  memberButton: {
    marginVertical: 4,
  },
  deleteButton: {
    borderWidth: 1,
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  saveButton: {
    borderRadius: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
});
