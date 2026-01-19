import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import {
  Appbar,
  Searchbar,
  Text,
  Divider,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import {
  DiscoveryActionCard,
  UserSearchResult,
  MyQRCodeModal,
} from './components';
import type { FriendsStackParamList } from '@navigation/types';
import {
  friendsApi,
  UserSearchResult as UserSearchResultType,
  OutgoingRequest,
} from '@services/api/friendsApi';
import { useFriendsStore } from '@store/friendsStore';
import { useUserStore } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';

type NavigationProp = NativeStackNavigationProp<
  FriendsStackParamList,
  'FriendDiscovery'
>;

/**
 * Friend Discovery screen for finding and adding new friends.
 * Includes username search, QR code actions, and pending outgoing requests.
 */
export default function FriendDiscoveryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { sendRequest } = useFriendsStore();
  const { currentUser } = useUserStore();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResultType[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch outgoing requests on mount
  const fetchOutgoingRequests = useCallback(async () => {
    try {
      const requests = await friendsApi.getOutgoingRequests();
      setOutgoingRequests(requests);
    } catch (error) {
      console.error('Error fetching outgoing requests:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingRequests(true);
      await fetchOutgoingRequests();
      setIsLoadingRequests(false);
    };
    loadData();
  }, [fetchOutgoingRequests]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await friendsApi.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      setSearchError(getErrorMessage(error));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
      } else {
        setIsSearching(true);
        // Debounce search by 300ms
        searchTimeoutRef.current = setTimeout(() => {
          performSearch(query);
        }, 300);
      }
    },
    [performSearch]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchOutgoingRequests();
    if (searchQuery.trim()) {
      await performSearch(searchQuery);
    }
    setIsRefreshing(false);
  }, [fetchOutgoingRequests, searchQuery, performSearch]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Quick actions
  const handleScanQR = useCallback(() => {
    navigation.navigate('QRScanner');
  }, [navigation]);

  const handleShowMyQR = useCallback(() => {
    setShowQRModal(true);
  }, []);

  const handleShareInvite = useCallback(async () => {
    if (!currentUser) return;

    try {
      const message = `Add me on Stepper! My user ID is: ${currentUser.id}`;
      await Share.share({
        message,
        title: 'Add me on Stepper',
      });
    } catch (error) {
      if ((error as Error).message !== 'User did not share') {
        Alert.alert('Error', getErrorMessage(error));
      }
    }
  }, [currentUser]);

  const handleDismissQRModal = useCallback(() => {
    setShowQRModal(false);
  }, []);

  // Add friend
  const handleAddFriend = useCallback(
    async (userId: string) => {
      try {
        await sendRequest(userId);
        // Remove from search results
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        // Refresh outgoing requests
        await fetchOutgoingRequests();
        Alert.alert('Success', 'Friend request sent!');
      } catch (error) {
        Alert.alert('Error', getErrorMessage(error));
        throw error;
      }
    },
    [sendRequest, fetchOutgoingRequests]
  );

  // Navigate to user profile
  const handleUserPress = useCallback(
    (user: UserSearchResultType) => {
      navigation.navigate('UserProfile', { userId: user.id });
    },
    [navigation]
  );

  // Format relative time
  const formatRelativeTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Sent today';
    if (diffDays === 1) return 'Sent yesterday';
    if (diffDays < 7) return `Sent ${diffDays} days ago`;
    if (diffDays < 14) return 'Sent 1 week ago';
    return `Sent ${Math.floor(diffDays / 7)} weeks ago`;
  }, []);

  // Render search results
  const renderSearchResult = useCallback(
    ({ item }: { item: UserSearchResultType }) => (
      <UserSearchResult
        user={item}
        onAddFriend={handleAddFriend}
        onPress={handleUserPress}
        testID={`search-result-${item.id}`}
      />
    ),
    [handleAddFriend, handleUserPress]
  );

  // Render outgoing request
  const renderOutgoingRequest = useCallback(
    ({ item }: { item: OutgoingRequest }) => (
      <View style={styles.outgoingRequestItem}>
        <View style={styles.outgoingRequestContent}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurface }}
            numberOfLines={1}
          >
            {item.display_name}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      </View>
    ),
    [theme.colors, formatRelativeTime]
  );

  const keyExtractorSearch = useCallback(
    (item: UserSearchResultType) => item.id,
    []
  );
  const keyExtractorRequest = useCallback(
    (item: OutgoingRequest) => item.id,
    []
  );

  // List header with search results or quick actions
  const ListHeaderComponent = useMemo(() => {
    const hasSearchQuery = searchQuery.trim().length > 0;

    return (
      <>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search by name..."
            onChangeText={handleSearchChange}
            value={searchQuery}
            style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
            testID="user-search-bar"
          />
        </View>

        {/* Search Results Section */}
        {hasSearchQuery && (
          <View style={styles.section}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Search Results
            </Text>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
              </View>
            ) : searchError ? (
              <Text
                variant="bodyMedium"
                style={[styles.emptyText, { color: theme.colors.error }]}
              >
                {searchError}
              </Text>
            ) : searchResults.length === 0 ? (
              <Text
                variant="bodyMedium"
                style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
              >
                No users found
              </Text>
            ) : null}
          </View>
        )}

        {/* Search Results List (inline in header when present) */}
        {hasSearchQuery && searchResults.length > 0 && (
          <View>
            {searchResults.map((item) => (
              <React.Fragment key={item.id}>
                {renderSearchResult({ item })}
                <Divider />
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Quick Actions (only when not searching) */}
        {!hasSearchQuery && (
          <>
            <View style={styles.section}>
              <Text
                variant="titleSmall"
                style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
              >
                Quick Actions
              </Text>
            </View>

            <DiscoveryActionCard
              icon="qrcode-scan"
              title="Scan QR Code"
              subtitle="Scan a friend's code"
              onPress={handleScanQR}
              testID="action-scan-qr"
            />

            <DiscoveryActionCard
              icon="qrcode"
              title="My QR Code"
              subtitle="Show your code to friends"
              onPress={handleShowMyQR}
              testID="action-my-qr"
            />

            <DiscoveryActionCard
              icon="share-variant"
              title="Share Invite Link"
              subtitle="Send a link via message"
              onPress={handleShareInvite}
              testID="action-share-invite"
            />
          </>
        )}

        {/* Pending Requests Section Header */}
        {!hasSearchQuery && outgoingRequests.length > 0 && (
          <View style={[styles.section, styles.pendingSection]}>
            <Text
              variant="titleSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Pending Requests ({outgoingRequests.length})
            </Text>
          </View>
        )}
      </>
    );
  }, [
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    outgoingRequests.length,
    theme.colors,
    handleSearchChange,
    handleScanQR,
    handleShowMyQR,
    handleShareInvite,
    renderSearchResult,
  ]);

  // Empty state for outgoing requests (when not searching)
  const ListEmptyComponent = useMemo(() => {
    if (searchQuery.trim() || isLoadingRequests) return null;

    return (
      <View style={styles.emptyState}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          No pending friend requests
        </Text>
      </View>
    );
  }, [searchQuery, isLoadingRequests, theme.colors]);

  // Show loading spinner on initial load
  if (isLoadingRequests && outgoingRequests.length === 0 && !searchQuery) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleBack} />
          <Appbar.Content title="Discover Friends" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} />
        <Appbar.Content title="Discover Friends" />
      </Appbar.Header>

      <FlatList
        data={searchQuery.trim() ? [] : outgoingRequests}
        renderItem={renderOutgoingRequest}
        keyExtractor={keyExtractorRequest}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
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
      />

      <MyQRCodeModal visible={showQRModal} onDismiss={handleDismissQRModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    elevation: 0,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pendingSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  outgoingRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  outgoingRequestContent: {
    flex: 1,
  },
  divider: {
    marginLeft: 16,
  },
});
