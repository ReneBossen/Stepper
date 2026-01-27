import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Appbar,
  Searchbar,
  TextInput,
  Text,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupsStore, Group } from '@store/groupsStore';
import { getErrorMessage } from '@utils/errorUtils';
import { getCompetitionTypeLabel } from '@utils/groupUtils';
import { isAlphanumeric } from '@utils/stringUtils';
import { INVITE_CODE, DEBOUNCE } from '@utils/constants';
import type { GroupsStackParamList, GroupsStackScreenProps } from '@navigation/types';

type Props = GroupsStackScreenProps<'JoinGroup'>;
type NavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'JoinGroup'>;

interface PublicGroupCardProps {
  group: Group;
  onJoin: (groupId: string) => void;
  isJoining: boolean;
  testID?: string;
}

/**
 * Card component for displaying a public group in the search results.
 */
function PublicGroupCard({ group, onJoin, isJoining, testID }: PublicGroupCardProps) {
  const theme = useTheme();
  const competitionLabel = getCompetitionTypeLabel(group.competition_type);

  const handleJoin = useCallback(() => {
    onJoin(group.id);
  }, [group.id, onJoin]);

  return (
    <Card style={styles.groupCard} mode="elevated" testID={testID}>
      <Card.Content style={styles.groupCardContent}>
        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupIcon}>{'\u{1F3C6}'}</Text>
            <Text
              variant="titleMedium"
              style={[styles.groupName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {group.name}
            </Text>
          </View>
          <View style={styles.groupMeta}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
            </Text>
            <Chip
              compact
              textStyle={styles.chipText}
              style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
            >
              {competitionLabel}
            </Chip>
          </View>
        </View>
        <Button
          mode="contained"
          onPress={handleJoin}
          loading={isJoining}
          disabled={isJoining}
          compact
          testID={`join-button-${group.id}`}
          accessibilityLabel={`Join ${group.name}`}
        >
          Join
        </Button>
      </Card.Content>
    </Card>
  );
}

/**
 * Screen for finding and joining groups.
 * Shows a searchable list of public groups with an invite code dialog.
 */
export default function JoinGroupScreen({ route }: Props) {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const initialInviteCode = route.params?.inviteCode || '';

  const {
    publicGroups,
    isSearching,
    searchError,
    featuredGroups,
    isLoadingFeatured,
    searchPublicGroups,
    fetchFeaturedGroups,
    joinGroup,
    joinGroupByCode,
    clearSearch,
  } = useGroupsStore();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [isJoiningGroup, setIsJoiningGroup] = useState<string | null>(null);
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load featured groups on mount
  useEffect(() => {
    fetchFeaturedGroups();
  }, [fetchFeaturedGroups]);

  // Open invite dialog if initial invite code is provided
  useEffect(() => {
    if (initialInviteCode) {
      setShowInviteDialog(true);
    }
  }, [initialInviteCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSearch();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [clearSearch]);

  // Perform search with debounce
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        clearSearch();
        return;
      }
      await searchPublicGroups(query);
    },
    [searchPublicGroups, clearSearch]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        clearSearch();
      } else {
        // Debounce search
        searchTimeoutRef.current = setTimeout(() => {
          performSearch(query);
        }, DEBOUNCE.SEARCH);
      }
    },
    [performSearch, clearSearch]
  );

  const handleInviteCodeChange = useCallback((code: string) => {
    setInviteCode(code.toUpperCase());
    if (inviteCodeError) {
      setInviteCodeError(null);
    }
  }, [inviteCodeError]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleJoinPublicGroup = useCallback(
    async (groupId: string) => {
      setIsJoiningGroup(groupId);
      try {
        await joinGroup(groupId);
        navigation.replace('GroupDetail', { groupId });
      } catch (error) {
        Alert.alert('Error', getErrorMessage(error));
      } finally {
        setIsJoiningGroup(null);
      }
    },
    [joinGroup, navigation]
  );

  const handleJoinWithCode = useCallback(async () => {
    const trimmedCode = inviteCode.trim();

    if (!trimmedCode) {
      setInviteCodeError('Please enter an invite code');
      return;
    }

    if (trimmedCode.length < INVITE_CODE.MIN_LENGTH || trimmedCode.length > INVITE_CODE.MAX_LENGTH) {
      setInviteCodeError(`Invite code must be ${INVITE_CODE.MIN_LENGTH}-${INVITE_CODE.MAX_LENGTH} characters`);
      return;
    }

    if (!isAlphanumeric(trimmedCode)) {
      setInviteCodeError('Invite code must contain only letters and numbers');
      return;
    }

    setIsJoiningByCode(true);
    setInviteCodeError(null);

    try {
      const groupId = await joinGroupByCode(trimmedCode);
      setShowInviteDialog(false);
      navigation.replace('GroupDetail', { groupId });
    } catch (error) {
      setInviteCodeError(getErrorMessage(error));
    } finally {
      setIsJoiningByCode(false);
    }
  }, [inviteCode, joinGroupByCode, navigation]);

  const handleDismissDialog = useCallback(() => {
    setShowInviteDialog(false);
    setInviteCodeError(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (searchQuery.trim()) {
      await performSearch(searchQuery);
    } else {
      await fetchFeaturedGroups();
    }
    setIsRefreshing(false);
  }, [searchQuery, performSearch, fetchFeaturedGroups]);

  const displayGroups = searchQuery.trim() ? publicGroups : featuredGroups;
  const isLoadingList = searchQuery.trim() ? isSearching : isLoadingFeatured;
  const sectionTitle = searchQuery.trim() ? 'Search Results' : 'Popular Groups';

  const renderGroupItem = useCallback(
    ({ item }: { item: Group }) => (
      <PublicGroupCard
        group={item}
        onJoin={handleJoinPublicGroup}
        isJoining={isJoiningGroup === item.id}
        testID={`public-group-${item.id}`}
      />
    ),
    [handleJoinPublicGroup, isJoiningGroup]
  );

  const keyExtractor = useCallback((item: Group) => item.id, []);

  const ListHeaderComponent = useCallback(() => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search public groups..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          testID="group-search-bar"
          accessibilityLabel="Search public groups"
        />
      </View>

      {/* Section Title */}
      <View style={styles.section}>
        <Text
          variant="titleSmall"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          {sectionTitle}
        </Text>

        {/* Loading State */}
        {isLoadingList && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
          </View>
        )}

        {/* Error State */}
        {searchError && !isLoadingList && searchQuery.trim() && (
          <Text
            variant="bodyMedium"
            style={[styles.emptyText, { color: theme.colors.error }]}
          >
            {searchError}
          </Text>
        )}

        {/* Empty State */}
        {!isLoadingList && !searchError && displayGroups.length === 0 && (
          <Text
            variant="bodyMedium"
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            No groups found
          </Text>
        )}
      </View>
    </>
  ), [
    searchQuery,
    sectionTitle,
    isLoadingList,
    searchError,
    displayGroups.length,
    theme.colors,
    handleSearchChange,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
        <Appbar.Content title="Find Groups" />
        <Appbar.Action
          icon="ticket-outline"
          onPress={() => setShowInviteDialog(true)}
          accessibilityLabel="Join with invite code"
        />
      </Appbar.Header>

      <FlatList
        data={displayGroups}
        renderItem={renderGroupItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <Portal>
        <Dialog visible={showInviteDialog} onDismiss={handleDismissDialog}>
          <Dialog.Title>Join with Invite Code</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Enter Invite Code"
              value={inviteCode}
              onChangeText={handleInviteCodeChange}
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
                style={[styles.dialogErrorText, { color: theme.colors.error }]}
              >
                {inviteCodeError}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismissDialog}>Cancel</Button>
            <Button
              onPress={handleJoinWithCode}
              loading={isJoiningByCode}
              disabled={isJoiningByCode || !inviteCode.trim()}
              testID="join-with-code-button"
            >
              Join
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 0,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
    marginBottom: 12,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    paddingVertical: 8,
  },
  errorText: {
    marginBottom: 8,
    marginLeft: 4,
  },
  dialogErrorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  groupCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  groupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupInfo: {
    flex: 1,
    marginRight: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  groupName: {
    fontWeight: '600',
    flex: 1,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  chip: {
    height: 24,
  },
  chipText: {
    fontSize: 11,
    marginVertical: 0,
    marginHorizontal: 0,
  },
});
