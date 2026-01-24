import React, { useCallback, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Appbar,
  Text,
  TextInput,
  Avatar,
  Button,
  HelperText,
  Divider,
  Menu,
  List,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore, PrivacyLevel } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';
import { getInitials } from '@utils/stringUtils';
import type { SettingsStackParamList } from '@navigation/types';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'EditProfile'>;

// Validation constants
const DISPLAY_NAME_MIN = 1;
const DISPLAY_NAME_MAX = 50;

interface FormErrors {
  displayName?: string;
}

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Visible to everyone' },
  { value: 'partial', label: 'Friends Only', description: 'Visible to friends only' },
  { value: 'private', label: 'Private', description: 'Hidden from others' },
];

/**
 * Edit Profile screen allowing users to update their profile information,
 * avatar, and privacy settings.
 */
export default function EditProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const {
    currentUser,
    isLoading,
    updateProfile,
    updatePreferences,
    uploadAvatar,
  } = useUserStore();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<PrivacyLevel>('public');
  const [activityVisibility, setActivityVisibility] = useState<PrivacyLevel>('partial');

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState<'profile' | 'activity' | null>(null);

  // Menu handler with small delay to avoid react-native-paper Menu animation issues
  const handleOpenMenu = useCallback((menu: 'profile' | 'activity') => {
    if (openMenu === menu) {
      setOpenMenu(null);
    } else {
      setOpenMenu(null); // Close any open menu first
      setTimeout(() => setOpenMenu(menu), 100); // Small delay before opening new one
    }
  }, [openMenu]);

  // Initialize form with current user data
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.display_name || '');
      setAvatarUri(currentUser.avatar_url || null);
      setProfileVisibility(currentUser.preferences.privacy_find_me);
      setActivityVisibility(currentUser.preferences.privacy_show_steps);
    }
  }, [currentUser]);

  // Track changes
  useEffect(() => {
    if (!currentUser) return;

    const hasProfileChanges =
      displayName !== (currentUser.display_name || '') ||
      (avatarUri && avatarUri !== currentUser.avatar_url);

    const hasPreferencesChanges =
      profileVisibility !== currentUser.preferences.privacy_find_me ||
      activityVisibility !== currentUser.preferences.privacy_show_steps;

    setHasChanges(hasProfileChanges || hasPreferencesChanges);
  }, [displayName, avatarUri, profileVisibility, activityVisibility, currentUser]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Display name validation
    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.length < DISPLAY_NAME_MIN) {
      newErrors.displayName = `Display name must be at least ${DISPLAY_NAME_MIN} character`;
    } else if (displayName.length > DISPLAY_NAME_MAX) {
      newErrors.displayName = `Display name must be at most ${DISPLAY_NAME_MAX} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [displayName]);

  // Handle image picker
  const handleChangePhoto = useCallback(async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to change your profile picture.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    const isValid = validateForm();
    if (!isValid) return;

    setIsSaving(true);

    try {
      // Upload new avatar if changed
      let newAvatarUrl = currentUser?.avatar_url;
      if (avatarUri && avatarUri !== currentUser?.avatar_url) {
        newAvatarUrl = await uploadAvatar(avatarUri);
      }

      // Update profile
      await updateProfile({
        display_name: displayName.trim(),
        avatar_url: newAvatarUrl,
      });

      // Update preferences if changed
      if (
        profileVisibility !== currentUser?.preferences.privacy_find_me ||
        activityVisibility !== currentUser?.preferences.privacy_show_steps
      ) {
        await updatePreferences({
          privacy_find_me: profileVisibility,
          privacy_show_steps: activityVisibility,
        });
      }

      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [
    validateForm,
    currentUser,
    avatarUri,
    displayName,
    profileVisibility,
    activityVisibility,
    uploadAvatar,
    updateProfile,
    updatePreferences,
    navigation,
  ]);

  // Handle cancel with confirmation
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [hasChanges, navigation]);

  // Get privacy option label
  const getPrivacyLabel = (value: PrivacyLevel): string => {
    return PRIVACY_OPTIONS.find((opt) => opt.value === value)?.label || 'Public';
  };

  if (!currentUser) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Action
          icon="close"
          onPress={handleCancel}
          accessibilityLabel="Cancel editing"
        />
        <Appbar.Content title="Edit Profile" />
        <Appbar.Action
          icon="check"
          onPress={handleSave}
          disabled={isSaving || !hasChanges}
          accessibilityLabel="Save profile"
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Pressable
              onPress={handleChangePhoto}
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
            >
              {avatarUri ? (
                <Avatar.Image
                  size={100}
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                />
              ) : (
                <Avatar.Text
                  size={100}
                  label={getInitials(displayName || 'U')}
                  style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}
                  labelStyle={{ color: theme.colors.onPrimaryContainer }}
                />
              )}
            </Pressable>
            <Button
              mode="text"
              onPress={handleChangePhoto}
              style={styles.changePhotoButton}
              accessibilityLabel="Change profile photo"
            >
              Change Photo
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* Profile Information Section */}
          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Profile Information
            </Text>

            <TextInput
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              maxLength={DISPLAY_NAME_MAX}
              error={!!errors.displayName}
              style={styles.input}
              accessibilityLabel="Display name"
              testID="input-display-name"
            />
            {errors.displayName && (
              <HelperText type="error" visible>
                {errors.displayName}
              </HelperText>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Privacy Section */}
          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Privacy
            </Text>

            <Menu
              visible={openMenu === 'profile'}
              onDismiss={() => setOpenMenu(null)}
              anchor={
                <List.Item
                  title="Profile Visibility"
                  description={getPrivacyLabel(profileVisibility)}
                  onPress={() => handleOpenMenu('profile')}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  style={styles.menuItem}
                  accessibilityLabel={`Profile visibility: ${getPrivacyLabel(profileVisibility)}`}
                  accessibilityRole="button"
                  testID="privacy-profile"
                />
              }
            >
              {PRIVACY_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setProfileVisibility(option.value);
                    setOpenMenu(null);
                  }}
                  title={option.label}
                  leadingIcon={profileVisibility === option.value ? 'check' : undefined}
                />
              ))}
            </Menu>

            <Menu
              visible={openMenu === 'activity'}
              onDismiss={() => setOpenMenu(null)}
              anchor={
                <List.Item
                  title="Activity Visibility"
                  description={getPrivacyLabel(activityVisibility)}
                  onPress={() => handleOpenMenu('activity')}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  style={styles.menuItem}
                  accessibilityLabel={`Activity visibility: ${getPrivacyLabel(activityVisibility)}`}
                  accessibilityRole="button"
                  testID="privacy-activity"
                />
              }
            >
              {PRIVACY_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setActivityVisibility(option.value);
                    setOpenMenu(null);
                  }}
                  title={option.label}
                  leadingIcon={activityVisibility === option.value ? 'check' : undefined}
                />
              ))}
            </Menu>
          </View>

          {/* Save Button (for accessibility at bottom) */}
          <View style={styles.buttonSection}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving || !hasChanges}
              style={styles.saveButton}
              accessibilityLabel="Save profile changes"
              testID="save-button"
            >
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    marginBottom: 8,
  },
  changePhotoButton: {
    marginTop: 4,
  },
  divider: {
    marginHorizontal: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  menuItem: {
    paddingVertical: 4,
  },
  buttonSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  saveButton: {
    marginTop: 8,
  },
});
