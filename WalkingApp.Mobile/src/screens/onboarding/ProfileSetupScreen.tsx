import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import OnboardingLayout from './components/OnboardingLayout';
import ProfilePhotoUploader from './components/ProfilePhotoUploader';
import { useUserStore } from '@store/userStore';

type ProfileSetupScreenProps = OnboardingStackScreenProps<'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation }: ProfileSetupScreenProps) {
  const theme = useTheme();
  const { updateProfile, uploadAvatar } = useUserStore();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = async (uri: string) => {
    setAvatarUri(uri);
    setIsUploading(true);
    setError(null);

    try {
      await uploadAvatar(uri);
    } catch (err: any) {
      setError('Failed to upload photo. Please try again.');
      setAvatarUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = async () => {
    if (displayName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (displayName.length > 50) {
      setError('Display name must be less than 50 characters');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateProfile({
        display_name: displayName,
        bio: bio || undefined,
      });
      navigation.navigate('PreferencesSetup');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('PreferencesSetup');
  };

  const isValid = displayName.length >= 2 && displayName.length <= 50;

  return (
    <OnboardingLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
              Set Up Your Profile
            </Text>
          </View>

          <ProfilePhotoUploader
            avatarUrl={avatarUri}
            onImageSelected={handleImageSelected}
            isUploading={isUploading}
          />

          <TextInput
            mode="outlined"
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
            error={!!error && displayName.length > 0}
            style={styles.input}
          />
          <HelperText type="info" visible={true}>
            {displayName.length}/50 characters
          </HelperText>

          <TextInput
            mode="outlined"
            label="Bio (Optional)"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            maxLength={200}
            style={styles.bioInput}
          />
          <HelperText type="info" visible={true}>
            {bio.length}/200 characters
          </HelperText>

          {error && (
            <HelperText type="error" visible={true}>
              {error}
            </HelperText>
          )}

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleContinue}
              disabled={!isValid || isSaving || isUploading}
              loading={isSaving}
              style={styles.continueButton}
            >
              Continue
            </Button>
            <Button mode="text" onPress={handleSkip} style={styles.skipButton} disabled={isSaving}>
              Skip for now
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 8,
    marginTop: 16,
  },
  title: {
    fontWeight: '700',
  },
  input: {
    marginTop: 16,
  },
  bioInput: {
    marginTop: 16,
    minHeight: 100,
  },
  footer: {
    marginTop: 32,
  },
  continueButton: {
    marginBottom: 12,
  },
  skipButton: {
    alignSelf: 'center',
  },
});
