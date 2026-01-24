import React, { useState, useCallback } from 'react';
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
  SegmentedButtons,
  RadioButton,
  Button,
  HelperText,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupsStore } from '@store/groupsStore';
import { getErrorMessage } from '@utils/errorUtils';
import type { GroupsStackParamList } from '@navigation/types';

type NavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'CreateGroup'>;

/**
 * Screen for creating a new group.
 * Includes form for group details, competition type, and privacy settings.
 */
export default function CreateGroupScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { createGroup, isLoading } = useGroupsStore();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [competitionType, setCompetitionType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [privacyType, setPrivacyType] = useState<'public' | 'private'>('public');

  // Validation state
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

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
    if (nameError) {
      validateName(value);
    }
  }, [nameError, validateName]);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    if (descriptionError) {
      validateDescription(value);
    }
  }, [descriptionError, validateDescription]);

  const handleNameBlur = useCallback(() => {
    validateName(name);
  }, [name, validateName]);

  const handleDescriptionBlur = useCallback(() => {
    validateDescription(description);
  }, [description, validateDescription]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCreate = useCallback(async () => {
    // Validate all fields
    const isNameValid = validateName(name);
    const isDescriptionValid = validateDescription(description);

    if (!isNameValid || !isDescriptionValid) {
      return;
    }

    try {
      const group = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        competition_type: competitionType,
        is_private: privacyType === 'private',
      });

      // Navigate to the group detail screen
      navigation.replace('GroupDetail', { groupId: group.id });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [name, description, competitionType, privacyType, validateName, validateDescription, createGroup, navigation]);

  const competitionButtons = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
        <Appbar.Content title="Create Group" />
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
          {/* Group Details Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Group Details
            </Text>

            <TextInput
              label="Group Name *"
              value={name}
              onChangeText={handleNameChange}
              onBlur={handleNameBlur}
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
              onBlur={handleDescriptionBlur}
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
            <HelperText type="error" visible={!!descriptionError}>
              {descriptionError}
            </HelperText>
          </View>

          {/* Competition Type Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Competition Type *
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              How often the leaderboard resets
            </Text>

            <SegmentedButtons
              value={competitionType}
              onValueChange={(value) => setCompetitionType(value as 'daily' | 'weekly' | 'monthly')}
              buttons={competitionButtons}
              style={styles.segmentedButtons}
            />
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Privacy
            </Text>

            <RadioButton.Group
              onValueChange={(value) => setPrivacyType(value as 'public' | 'private')}
              value={privacyType}
            >
              <View style={styles.radioOption}>
                <RadioButton.Item
                  label="Public (searchable by anyone)"
                  value="public"
                  style={styles.radioItem}
                  labelStyle={styles.radioLabel}
                  testID="privacy-public-radio"
                  accessibilityLabel="Public group, searchable by anyone"
                />
              </View>
              <View style={styles.radioOption}>
                <RadioButton.Item
                  label="Private (invite only)"
                  value="private"
                  style={styles.radioItem}
                  labelStyle={styles.radioLabel}
                  testID="privacy-private-radio"
                  accessibilityLabel="Private group, invite only"
                />
              </View>
            </RadioButton.Group>

            {privacyType === 'private' && (
              <Text
                variant="bodySmall"
                style={[styles.privacyNote, { color: theme.colors.onSurfaceVariant }]}
              >
                An invite code will be generated after creation
              </Text>
            )}
          </View>

          {/* Create Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={isLoading}
              disabled={isLoading}
              style={styles.createButton}
              contentStyle={styles.createButtonContent}
              testID="create-group-button"
              accessibilityLabel="Create group"
            >
              Create Group
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
    marginBottom: 12,
  },
  sectionDescription: {
    marginBottom: 12,
    marginTop: -8,
  },
  input: {
    marginBottom: 4,
  },
  segmentedButtons: {
    marginTop: 4,
  },
  radioOption: {
    marginVertical: -4,
  },
  radioItem: {
    paddingVertical: 4,
  },
  radioLabel: {
    fontSize: 14,
  },
  privacyNote: {
    marginTop: 8,
    marginLeft: 48,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 16,
  },
  createButton: {
    borderRadius: 8,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
});
