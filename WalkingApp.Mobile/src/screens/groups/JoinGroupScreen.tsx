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
  Divider,
  Card,
  Chip,
  ActivityIndicator,
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
 * Screen for joining existing groups.
 * Supports search for public groups and joining via invite code.
 */
export default function JoinGroupScreen({ route }: Props) {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const initialInviteCode = route.params?.inviteCode || '';

  const {
    publicGroups,
    isSearching,
    searchError,
    isLoading,
    searchPublicGroups,
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      navigation.replace('GroupDetail', { groupId });
    } catch (error) {
      setInviteCodeError(getErrorMessage(error));
    } finally {
      setIsJoiningByCode(false);
    }
  }, [inviteCode, joinGroupByCode, navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (searchQuery.trim()) {
      await performSearch(searchQuery);
    }
    setIsRefreshing(false);
  }, [searchQuery, performSearch]);

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

  const ListHeaderComponent = useCallback(() => {
    const hasSearchQuery = searchQuery.trim().length > 0;

    return (
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

        {/* OR Divider */}
        <View style={styles.orDivider}>
          <Divider style={styles.dividerLine} />
          <Text
            variant="bodySmall"
            style={[styles.orText, { color: theme.colors.onSurfaceVariant }]}
          >
            OR
          </Text>
          <Divider style={styles.dividerLine} />
        </View>

        {/* Invite Code Section */}
        <View style={styles.inviteCodeSection}>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Join with Invite Code
          </Text>
          <TextInput
            label="Enter Invite Code"
            value={inviteCode}
            onChangeText={handleInviteCodeChange}
            mode="outlined"
            style={styles.inviteCodeInput}
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
          <Button
            mode="contained"
            onPress={handleJoinWithCode}
            loading={isJoiningByCode}
            disabled={isJoiningByCode || !inviteCode.trim()}
            style={styles.joinCodeButton}
            testID="join-with-code-button"
            accessibilityLabel="Join group with invite code"
          >
            Join with Code
          </Button>
        </View>

        {/* Public Groups Section */}
        {hasSearchQuery && (
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Search Results
            </Text>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
              </View>
            )}
            {searchError && !isSearching && (
              <Text
                variant="bodyMedium"
                style={[styles.emptyText, { color: theme.colors.error }]}
              >
                {searchError}
              </Text>
            )}
            {!isSearching && !searchError && publicGroups.length === 0 && (
              <Text
                variant="bodyMedium"
                style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
              >
                No public groups found
              </Text>
            )}
          </View>
        )}
      </>
    );
  }, [
    searchQuery,
    inviteCode,
    inviteCodeError,
    isSearching,
    searchError,
    publicGroups.length,
    isJoiningByCode,
    theme.colors,
    handleSearchChange,
    handleInviteCodeChange,
    handleJoinWithCode,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
        <Appbar.Content title="Join Group" />
      </Appbar.Header>

      <FlatList
        data={searchQuery.trim() ? publicGroups : []}
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
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dividerLine: {
    flex: 1,
  },
  orText: {
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  inviteCodeSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
    marginBottom: 12,
  },
  inviteCodeInput: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 8,
    marginLeft: 4,
  },
  joinCodeButton: {
    marginTop: 8,
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
