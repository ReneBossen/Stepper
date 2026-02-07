import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Appbar,
  Searchbar,
  Text,
  Avatar,
  Chip,
  IconButton,
  Menu,
  Divider,
  Button,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { useGroupsStore, GroupMember } from '@store/groupsStore';
import { useUserStore } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';
import { getInitials } from '@utils/stringUtils';
import type { GroupsStackScreenProps, GroupsStackParamList } from '@navigation/types';
import { GROUPS_ROUTES } from '@navigation/routes';

type Props = GroupsStackScreenProps<'ManageMembers'>;
type NavigationProp = NativeStackNavigationProp<GroupsStackParamList, 'ManageMembers'>;

interface MemberItemProps {
  member: GroupMember;
  currentUserId: string;
  userRole: 'owner' | 'admin' | 'member' | undefined;
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onRemove: (userId: string) => void;
  isPending?: boolean;
  onApprove?: (userId: string) => void;
  onDeny?: (userId: string) => void;
}

/**
 * Component for rendering a single member item with menu actions.
 */
function MemberItem({
  member,
  currentUserId,
  userRole,
  onPromote,
  onDemote,
  onRemove,
  isPending,
  onApprove,
  onDeny,
}: MemberItemProps) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const isCurrentUser = member.user_id === currentUserId;
  const isOwner = member.role === 'owner';
  const isAdmin = member.role === 'admin';
  const isMember = member.role === 'member';
  const canManage = userRole === 'owner' || userRole === 'admin';
  const canModifyMember = canManage && !isCurrentUser && !isOwner;

  const handleOpenMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handlePromote = useCallback(() => {
    handleCloseMenu();
    onPromote(member.user_id);
  }, [member.user_id, onPromote, handleCloseMenu]);

  const handleDemote = useCallback(() => {
    handleCloseMenu();
    onDemote(member.user_id);
  }, [member.user_id, onDemote, handleCloseMenu]);

  const handleRemove = useCallback(() => {
    handleCloseMenu();
    onRemove(member.user_id);
  }, [member.user_id, onRemove, handleCloseMenu]);

  const getRoleBadgeColor = () => {
    if (isOwner) return theme.colors.primary;
    if (isAdmin) return theme.colors.secondary;
    return theme.colors.surfaceVariant;
  };

  const getRoleLabel = () => {
    if (isOwner) return 'Owner';
    if (isAdmin) return 'Admin';
    if (isPending) return 'Pending';
    return 'Member';
  };

  const accessibilityLabel = `${member.display_name}, ${getRoleLabel()}${isCurrentUser ? ', You' : ''}`;

  return (
    <View
      style={styles.memberItem}
      accessibilityLabel={accessibilityLabel}
      testID={`member-item-${member.user_id}`}
    >
      {member.avatar_url ? (
        <Avatar.Image size={48} source={{ uri: member.avatar_url }} />
      ) : (
        <Avatar.Text
          size={48}
          label={getInitials(member.display_name)}
          style={{ backgroundColor: theme.colors.primaryContainer }}
        />
      )}

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text
            variant="bodyLarge"
            style={[
              styles.memberName,
              { color: theme.colors.onSurface },
              isCurrentUser && { fontWeight: '600' },
            ]}
            numberOfLines={1}
          >
            {member.display_name}
            {isCurrentUser && ' (You)'}
          </Text>
          <Chip
            compact
            textStyle={styles.roleChipText}
            style={[styles.roleChip, { backgroundColor: getRoleBadgeColor() }]}
          >
            {getRoleLabel()}
          </Chip>
        </View>
        {member.username && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}
          >
            @{member.username}
          </Text>
        )}
      </View>

      {isPending && onApprove && onDeny ? (
        <View style={styles.pendingActions}>
          <IconButton
            icon="check"
            iconColor={theme.colors.primary}
            onPress={() => onApprove(member.user_id)}
            testID={`approve-${member.user_id}`}
            accessibilityLabel={`Approve ${member.display_name}`}
          />
          <IconButton
            icon="close"
            iconColor={theme.colors.error}
            onPress={() => onDeny(member.user_id)}
            testID={`deny-${member.user_id}`}
            accessibilityLabel={`Deny ${member.display_name}`}
          />
        </View>
      ) : canModifyMember ? (
        <Menu
          visible={menuVisible}
          onDismiss={handleCloseMenu}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={handleOpenMenu}
              testID={`member-menu-${member.user_id}`}
              accessibilityLabel={`Actions for ${member.display_name}`}
            />
          }
        >
          {isMember && userRole === 'owner' && (
            <Menu.Item
              onPress={handlePromote}
              title="Promote to Admin"
              leadingIcon="arrow-up"
            />
          )}
          {isAdmin && userRole === 'owner' && (
            <Menu.Item
              onPress={handleDemote}
              title="Demote to Member"
              leadingIcon="arrow-down"
            />
          )}
          <Divider />
          <Menu.Item
            onPress={handleRemove}
            title="Remove from Group"
            leadingIcon="account-remove"
            titleStyle={{ color: theme.colors.error }}
          />
        </Menu>
      ) : null}
    </View>
  );
}

interface SectionData {
  title: string;
  data: GroupMember[];
}

/**
 * Screen for managing group members.
 * Allows admins to promote, demote, and remove members.
 * Allows approving/denying pending requests.
 */
export default function ManageMembersScreen({ route }: Props) {
  const { groupId } = route.params;
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { currentUser } = useUserStore();

  const {
    managementGroup,
    members,
    pendingMembers,
    isLoadingManagement,
    managementError,
    fetchGroupDetails,
    fetchMembers,
    fetchPendingMembers,
    promoteMember,
    demoteMember,
    removeMember,
    approveMember,
    denyMember,
    clearManagementState,
  } = useGroupsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data
  useEffect(() => {
    fetchGroupDetails(groupId);
    fetchMembers(groupId);
    fetchPendingMembers(groupId);
  }, [groupId, fetchGroupDetails, fetchMembers, fetchPendingMembers]);

  // Note: State is intentionally not cleared on unmount as GroupManagement may need it

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchMembers(groupId),
      fetchPendingMembers(groupId),
    ]);
    setIsRefreshing(false);
  }, [groupId, fetchMembers, fetchPendingMembers]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddMember = useCallback(() => {
    navigation.navigate(GROUPS_ROUTES.InviteMembers, { groupId });
  }, [groupId, navigation]);

  const handlePromote = useCallback(
    async (userId: string) => {
      try {
        await promoteMember(groupId, userId);
        Alert.alert('Success', 'Member promoted to admin');
      } catch (error) {
        Alert.alert('Error', getErrorMessage(error));
      }
    },
    [groupId, promoteMember]
  );

  const handleDemote = useCallback(
    async (userId: string) => {
      Alert.alert(
        'Demote Member',
        'Are you sure you want to demote this admin to a regular member?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Demote',
            onPress: async () => {
              try {
                await demoteMember(groupId, userId);
                Alert.alert('Success', 'Admin demoted to member');
              } catch (error) {
                Alert.alert('Error', getErrorMessage(error));
              }
            },
          },
        ]
      );
    },
    [groupId, demoteMember]
  );

  const handleRemove = useCallback(
    async (userId: string) => {
      Alert.alert(
        'Remove Member',
        'Are you sure you want to remove this member from the group?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember(groupId, userId);
                Alert.alert('Success', 'Member removed from group');
              } catch (error) {
                Alert.alert('Error', getErrorMessage(error));
              }
            },
          },
        ]
      );
    },
    [groupId, removeMember]
  );

  const handleApprove = useCallback(
    async (userId: string) => {
      try {
        await approveMember(groupId, userId);
        Alert.alert('Success', 'Member approved');
      } catch (error) {
        Alert.alert('Error', getErrorMessage(error));
      }
    },
    [groupId, approveMember]
  );

  const handleDeny = useCallback(
    async (userId: string) => {
      Alert.alert(
        'Deny Request',
        'Are you sure you want to deny this membership request?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deny',
            style: 'destructive',
            onPress: async () => {
              try {
                await denyMember(groupId, userId);
                Alert.alert('Success', 'Request denied');
              } catch (error) {
                Alert.alert('Error', getErrorMessage(error));
              }
            },
          },
        ]
      );
    },
    [groupId, denyMember]
  );

  // Filter and organize members into sections
  const sections: SectionData[] = useMemo(() => {
    const query = searchQuery.toLowerCase();

    const filterMembers = (list: GroupMember[]) =>
      query
        ? list.filter(
            (m) =>
              m.display_name.toLowerCase().includes(query) ||
              (m.username && m.username.toLowerCase().includes(query))
          )
        : list;

    const filteredMembers = filterMembers(members);
    const filteredPending = filterMembers(pendingMembers);

    const owners = filteredMembers.filter((m) => m.role === 'owner');
    const admins = filteredMembers.filter((m) => m.role === 'admin');
    const regularMembers = filteredMembers.filter((m) => m.role === 'member');

    const result: SectionData[] = [];

    if (owners.length > 0 || admins.length > 0) {
      result.push({
        title: `Admins (${owners.length + admins.length})`,
        data: [...owners, ...admins],
      });
    }

    if (regularMembers.length > 0) {
      result.push({
        title: `Members (${regularMembers.length})`,
        data: regularMembers,
      });
    }

    if (filteredPending.length > 0) {
      result.push({
        title: `Pending (${filteredPending.length})`,
        data: filteredPending,
      });
    }

    return result;
  }, [members, pendingMembers, searchQuery]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          variant="titleSmall"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
          {section.title}
        </Text>
      </View>
    ),
    [theme.colors]
  );

  const renderItem = useCallback(
    ({ item, section }: { item: GroupMember; section: SectionData }) => {
      const isPending = section.title.startsWith('Pending');
      return (
        <MemberItem
          member={item}
          currentUserId={currentUser?.id || ''}
          userRole={managementGroup?.user_role}
          onPromote={handlePromote}
          onDemote={handleDemote}
          onRemove={handleRemove}
          isPending={isPending}
          onApprove={isPending ? handleApprove : undefined}
          onDeny={isPending ? handleDeny : undefined}
        />
      );
    },
    [
      currentUser?.id,
      managementGroup?.user_role,
      handlePromote,
      handleDemote,
      handleRemove,
      handleApprove,
      handleDeny,
    ]
  );

  const keyExtractor = useCallback((item: GroupMember) => item.user_id, []);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {searchQuery ? 'No members found' : 'No members yet'}
        </Text>
      </View>
    ),
    [searchQuery, theme.colors]
  );

  // Loading state
  if (isLoadingManagement && members.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
          <Appbar.Content title="Manage Members" />
        </Appbar.Header>
        <LoadingSpinner />
      </View>
    );
  }

  // Error state
  if (managementError && members.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
          <Appbar.Content title="Manage Members" />
        </Appbar.Header>
        <ErrorMessage message={managementError} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={handleBack} accessibilityLabel="Go back" />
        <Appbar.Content title="Manage Members" />
        <Appbar.Action
          icon="account-plus"
          onPress={handleAddMember}
          accessibilityLabel="Add member"
        />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search members..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          testID="member-search-bar"
          accessibilityLabel="Search members"
        />
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={() => <Divider style={styles.itemDivider} />}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    elevation: 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    flex: 1,
  },
  roleChip: {
    height: 24,
  },
  roleChipText: {
    fontSize: 10,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  pendingActions: {
    flexDirection: 'row',
  },
  itemDivider: {
    marginLeft: 76,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
});
