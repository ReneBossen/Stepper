import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, Button, TextInput, Avatar } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import { useAppTheme } from '@hooks/useAppTheme';
import { useUserStore } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';
import OnboardingLayout from './components/OnboardingLayout';
import * as ImagePicker from 'expo-image-picker';

type Props = OnboardingStackScreenProps<'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const updateProfile = useUserStore((state) => state.updateProfile);
  const uploadAvatar = useUserStore((state) => state.uploadAvatar);
  const currentUser = useUserStore((state) => state.currentUser);

  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to set a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your camera to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePhotoPress = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validateForm = (): boolean => {
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required');
      return false;
    }

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return false;
    }

    if (displayName.trim().length > 50) {
      setError('Display name must not exceed 50 characters');
      return false;
    }

    if (bio.length > 200) {
      setError('Bio must not exceed 200 characters');
      return false;
    }

    return true;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Upload avatar if user selected one
      let avatarUrl = currentUser?.avatar_url;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri);
      }

      // Update profile with display name and avatar
      await updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      });

      // Navigate to preferences setup
      navigation.navigate('PreferencesSetup');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      setError(getErrorMessage(error, 'Failed to update profile. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('PreferencesSetup');
  };

  const displayNameLength = displayName.length;
  const bioLength = bio.length;

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.primary }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text variant="headlineMedium" style={[styles.title, { color: paperTheme.colors.onBackground }]}>
            Set Up Your Profile
          </Text>

          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handlePhotoPress} activeOpacity={0.7}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : currentUser?.avatar_url ? (
                <Avatar.Image size={120} source={{ uri: currentUser.avatar_url }} />
              ) : (
                <Avatar.Icon size={120} icon="account" />
              )}
              <View style={[styles.cameraIcon, { backgroundColor: paperTheme.colors.primary }]}>
                <Text style={styles.cameraEmoji}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text variant="bodySmall" style={[styles.avatarText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Add Profile Photo
            </Text>
          </View>

          <TextInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
            autoCapitalize="words"
            maxLength={50}
            right={<TextInput.Affix text={`${displayNameLength}/50`} />}
          />

          <TextInput
            label="Bio (Optional)"
            value={bio}
            onChangeText={setBio}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
            multiline
            numberOfLines={3}
            maxLength={200}
            right={<TextInput.Affix text={`${bioLength}/200`} />}
            placeholder="Love walking and staying active!"
          />

          {error && (
            <Text variant="bodySmall" style={[styles.error, { color: paperTheme.colors.error }]}>
              {error}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            loading={isLoading}
            disabled={isLoading || !displayName.trim()}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Continue
          </Button>
          <TouchableOpacity onPress={handleSkip} style={styles.skipTextButton} disabled={isLoading}>
            <Text variant="labelLarge" style={{ color: paperTheme.colors.primary }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraEmoji: {
    fontSize: 20,
  },
  avatarText: {
    marginTop: 12,
  },
  input: {
    marginBottom: 16,
  },
  error: {
    marginTop: 8,
  },
  footer: {
    paddingTop: 16,
  },
  button: {
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  skipTextButton: {
    padding: 12,
    alignSelf: 'center',
  },
});
