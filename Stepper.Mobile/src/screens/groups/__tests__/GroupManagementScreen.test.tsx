import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import GroupManagementScreen from '../GroupManagementScreen';
import { useGroupsStore, GroupManagementDetail } from '@store/groupsStore';

// Mock dependencies
jest.mock('@store/groupsStore');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockPopToTop = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    popToTop: mockPopToTop,
  }),
  useFocusEffect: (callback: () => any) => {
    React.useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, []);
  },
}));

// Mock group utils
jest.mock('@utils/groupUtils', () => ({
  getCompetitionTypeLabelFull: (type: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily (Resets every day)',
      weekly: 'Weekly (Resets every Monday)',
      monthly: 'Monthly (Resets every 1st)',
    };
    return labels[type] || type;
  },
}));

// Mock error utils
jest.mock('@utils/errorUtils', () => ({
  getErrorMessage: (error: any) => error?.message || 'Unknown error',
}));

// Mock common components
jest.mock('@components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const RN = require('react-native');
    return <RN.View testID="loading-spinner" />;
  },
}));

jest.mock('@components/common/ErrorMessage', () => ({
  ErrorMessage: ({ message, onRetry }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID="error-message">
        <RN.Text testID="error-text">{message}</RN.Text>
        <RN.TouchableOpacity testID="retry-button" onPress={onRetry}>
          <RN.Text>Retry</RN.Text>
        </RN.TouchableOpacity>
      </RN.View>
    );
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  const Appbar = {
    Header: ({ children, elevated }: any) => (
      <RN.View testID="appbar-header">{children}</RN.View>
    ),
    Content: ({ title }: any) => (
      <RN.Text testID="appbar-title">{title}</RN.Text>
    ),
    BackAction: ({ onPress }: any) => (
      <RN.TouchableOpacity testID="back-button" onPress={onPress}>
        <RN.Text>Back</RN.Text>
      </RN.TouchableOpacity>
    ),
    Action: ({ icon, onPress, disabled }: any) => (
      <RN.TouchableOpacity
        testID={`appbar-action-${icon}`}
        onPress={onPress}
        disabled={disabled}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };

  return {
    Appbar,
    TextInput: ({ label, value, onChangeText, onBlur, error, testID, multiline, maxLength }: any) => (
      <RN.View testID={testID}>
        <RN.Text>{label}</RN.Text>
        <RN.TextInput
          testID={`${testID}-field`}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          multiline={multiline}
          maxLength={maxLength}
        />
        {error && <RN.Text testID={`${testID}-error`}>Error</RN.Text>}
      </RN.View>
    ),
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    Switch: ({ value, onValueChange, testID }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={() => onValueChange(!value)}
      >
        <RN.Text>{value ? 'On' : 'Off'}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Button: ({ children, onPress, loading, disabled, testID, icon, mode, textColor, style }: any) => (
      <RN.TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityState={{ disabled: disabled || loading }}
      >
        <RN.Text>{children}</RN.Text>
        {loading && <RN.Text testID={`${testID}-loading`}>Loading...</RN.Text>}
      </RN.TouchableOpacity>
    ),
    Divider: () => <RN.View testID="divider" />,
    IconButton: ({ icon, onPress, testID }: any) => (
      <RN.TouchableOpacity testID={testID} onPress={onPress}>
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    HelperText: ({ children, type, visible }: any) => (
      visible ? <RN.Text testID={`helper-${type}`}>{children}</RN.Text> : null
    ),
    Snackbar: ({ children, visible, onDismiss, testID }: any) => {
      if (!visible) return null;
      return (
        <RN.View testID={testID}>
          <RN.Text>{children}</RN.Text>
        </RN.View>
      );
    },
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        primaryContainer: '#E8F5E9',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        error: '#FF0000',
      },
    }),
  };
});

const mockUseGroupsStore = useGroupsStore as jest.MockedFunction<typeof useGroupsStore>;

describe('GroupManagementScreen', () => {
  const mockFetchGroupDetails = jest.fn();
  const mockFetchInviteCode = jest.fn();
  const mockUpdateGroup = jest.fn();
  const mockDeleteGroup = jest.fn();
  const mockClearManagementState = jest.fn();

  const createMockGroup = (overrides: Partial<GroupManagementDetail> = {}): GroupManagementDetail => ({
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group description',
    competition_type: 'weekly',
    is_private: false,
    require_approval: false,
    join_code: 'ABC123',
    created_by_id: 'owner-id',
    member_count: 10,
    max_members: 5,
    user_role: 'owner',
    ...overrides,
  });

  const defaultGroupsState = {
    managementGroup: createMockGroup(),
    inviteCode: 'ABC123XYZ',
    isLoadingManagement: false,
    managementError: null,
    fetchGroupDetails: mockFetchGroupDetails,
    fetchInviteCode: mockFetchInviteCode,
    updateGroup: mockUpdateGroup,
    deleteGroup: mockDeleteGroup,
    clearManagementState: mockClearManagementState,
  };

  const mockRoute = {
    params: { groupId: 'group-1' },
  };

  const mockNavigation = {
    goBack: mockGoBack,
    navigate: mockNavigate,
    popToTop: mockPopToTop,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGroupsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultGroupsState);
      }
      return defaultGroupsState;
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading with no data', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          managementGroup: null,
          isLoadingManagement: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should not show loading spinner when data exists', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          isLoadingManagement: true,
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(queryByTestId('loading-spinner')).toBeNull();
    });
  });

  describe('error state', () => {
    it('should show error message when error with no data', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          managementGroup: null,
          managementError: 'Failed to load group',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('error-message')).toBeTruthy();
      expect(getByTestId('error-text')).toHaveTextContent('Failed to load group');
    });

    it('should call fetch functions when retry is pressed', async () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          managementGroup: null,
          managementError: 'Failed to load',
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('retry-button'));

      await waitFor(() => {
        expect(mockFetchGroupDetails).toHaveBeenCalledWith('group-1');
        expect(mockFetchInviteCode).toHaveBeenCalledWith('group-1');
      });
    });
  });

  describe('displaying group details', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('appbar-title')).toHaveTextContent('Group Settings');
    });

    it('should display group name', () => {
      const { getByText } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByText('Test Group')).toBeTruthy();
    });

    it('should display group name input with current value', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      const input = getByTestId('group-name-input-field');
      expect(input.props.value).toBe('Test Group');
    });

    it('should display description input with current value', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      const input = getByTestId('group-description-input-field');
      expect(input.props.value).toBe('A test group description');
    });

    it('should display invite code', () => {
      const { getByText } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByText('ABC123XYZ')).toBeTruthy();
    });

    it('should display copy invite code button', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('copy-invite-code-button')).toBeTruthy();
    });

    it('should display manage members button', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('manage-members-button')).toBeTruthy();
    });

    it('should display invite members button', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('invite-members-button')).toBeTruthy();
    });

    it('should display member count in manage members button', () => {
      const { getByText } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByText('Manage Members (10)')).toBeTruthy();
    });
  });

  describe('editing name and description', () => {
    it('should update name when changed', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      const input = getByTestId('group-name-input-field');

      fireEvent.changeText(input, 'Updated Name');

      expect(input.props.value).toBe('Updated Name');
    });

    it('should update description when changed', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      const input = getByTestId('group-description-input-field');

      fireEvent.changeText(input, 'Updated description');

      expect(input.props.value).toBe('Updated description');
    });

    it('should show save button when changes are made', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      const input = getByTestId('group-name-input-field');

      fireEvent.changeText(input, 'Updated Name');

      expect(getByTestId('save-settings-button')).toBeTruthy();
    });
  });

  describe('privacy toggles', () => {
    it('should display private switch', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('private-switch')).toBeTruthy();
    });

    it('should display approval switch', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('approval-switch')).toBeTruthy();
    });

    it('should toggle private setting when pressed', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      const switchBtn = getByTestId('private-switch');

      fireEvent.press(switchBtn);

      // Should trigger save button to appear
      expect(getByTestId('save-settings-button')).toBeTruthy();
    });

    it('should toggle approval setting when pressed', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      const switchBtn = getByTestId('approval-switch');

      fireEvent.press(switchBtn);

      // Should trigger save button to appear
      expect(getByTestId('save-settings-button')).toBeTruthy();
    });
  });

  describe('invite code display and copy', () => {
    it('should copy to clipboard and show snackbar when copy button is pressed', async () => {
      const Clipboard = require('expo-clipboard');
      const { getByTestId, queryByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('copy-invite-code-button'));

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('ABC123XYZ');
      });

      // Snackbar should now be visible
      expect(queryByTestId('copy-success-snackbar')).toBeTruthy();
    });

    it('should display no code message when code is null', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          inviteCode: null,
        };
        return selector ? selector(state) : state;
      });

      const { getByText } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByText('No code generated')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to ManageMembers when button is pressed', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('manage-members-button'));

      expect(mockNavigate).toHaveBeenCalledWith('ManageMembers', { groupId: 'group-1' });
    });

    it('should navigate to InviteMembers when button is pressed', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('invite-members-button'));

      expect(mockNavigate).toHaveBeenCalledWith('InviteMembers', { groupId: 'group-1' });
    });

    it('should navigate back when back button is pressed and no changes', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should show confirmation when back button pressed with unsaved changes', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      // Make a change
      fireEvent.changeText(getByTestId('group-name-input-field'), 'New Name');

      // Press back
      fireEvent.press(getByTestId('back-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        expect.any(Array)
      );
    });
  });

  describe('delete group (owner only)', () => {
    it('should display delete button for owner', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(getByTestId('delete-group-button')).toBeTruthy();
    });

    it('should not display delete button for non-owner', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          managementGroup: createMockGroup({ user_role: 'admin' }),
        };
        return selector ? selector(state) : state;
      });

      const { queryByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      expect(queryByTestId('delete-group-button')).toBeNull();
    });

    it('should show confirmation dialog when delete is pressed', () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('delete-group-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Group',
        'Are you sure you want to delete this group? This action cannot be undone and all members will be removed.',
        expect.any(Array)
      );
    });

    it('should call deleteGroup when confirmed', async () => {
      mockDeleteGroup.mockResolvedValueOnce(undefined);

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('delete-group-button'));

      // Get the confirmation callback and call it
      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const deleteCall = alertCalls.find(call => call[0] === 'Delete Group');
      const deleteButton = deleteCall[2].find((btn: any) => btn.text === 'Delete');

      await deleteButton.onPress();

      expect(mockDeleteGroup).toHaveBeenCalledWith('group-1');
    });

    it('should navigate to top after successful delete', async () => {
      mockDeleteGroup.mockResolvedValueOnce(undefined);

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('delete-group-button'));

      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const deleteCall = alertCalls.find(call => call[0] === 'Delete Group');
      const deleteButton = deleteCall[2].find((btn: any) => btn.text === 'Delete');

      await deleteButton.onPress();

      await waitFor(() => {
        expect(mockPopToTop).toHaveBeenCalled();
      });
    });

    it('should show error alert on delete failure', async () => {
      mockDeleteGroup.mockRejectedValueOnce(new Error('Delete failed'));

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.press(getByTestId('delete-group-button'));

      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const deleteCall = alertCalls.find(call => call[0] === 'Delete Group');
      const deleteButton = deleteCall[2].find((btn: any) => btn.text === 'Delete');

      await deleteButton.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Delete failed');
      });
    });
  });

  describe('save changes', () => {
    it('should call updateGroup with correct data', async () => {
      mockUpdateGroup.mockResolvedValueOnce(undefined);

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.changeText(getByTestId('group-name-input-field'), 'New Name');
      fireEvent.changeText(getByTestId('group-description-input-field'), 'New Description');
      fireEvent.press(getByTestId('private-switch'));

      fireEvent.press(getByTestId('save-settings-button'));

      await waitFor(() => {
        expect(mockUpdateGroup).toHaveBeenCalledWith('group-1', {
          name: 'New Name',
          description: 'New Description',
          is_private: true,
          require_approval: false,
        });
      });
    });

    it('should show success alert on successful save', async () => {
      mockUpdateGroup.mockResolvedValueOnce(undefined);

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.changeText(getByTestId('group-name-input-field'), 'New Name');
      fireEvent.press(getByTestId('save-settings-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Group settings saved successfully');
      });
    });

    it('should show error alert on save failure', async () => {
      mockUpdateGroup.mockRejectedValueOnce(new Error('Save failed'));

      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.changeText(getByTestId('group-name-input-field'), 'New Name');
      fireEvent.press(getByTestId('save-settings-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Save failed');
      });
    });

    it('should not save when name validation fails', async () => {
      const { getByTestId } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );

      fireEvent.changeText(getByTestId('group-name-input-field'), 'AB'); // Too short
      fireEvent.press(getByTestId('save-settings-button'));

      await waitFor(() => {
        expect(mockUpdateGroup).not.toHaveBeenCalled();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch group details on mount', () => {
      render(<GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(mockFetchGroupDetails).toHaveBeenCalledWith('group-1');
    });

    it('should fetch invite code on mount', () => {
      render(<GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />);
      expect(mockFetchInviteCode).toHaveBeenCalledWith('group-1');
    });

    it('should clear management state on unmount', () => {
      const { unmount } = render(
        <GroupManagementScreen route={mockRoute as any} navigation={mockNavigation as any} />
      );
      unmount();
      expect(mockClearManagementState).toHaveBeenCalled();
    });
  });
});
