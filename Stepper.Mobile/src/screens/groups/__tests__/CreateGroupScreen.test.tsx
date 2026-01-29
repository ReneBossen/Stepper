import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CreateGroupScreen from '../CreateGroupScreen';
import { useGroupsStore, Group } from '@store/groupsStore';

// Mock dependencies
jest.mock('@store/groupsStore');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
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
    SegmentedButtons: ({ value, onValueChange, buttons, testID }: any) => (
      <RN.View testID={testID || 'segmented-buttons'}>
        {buttons.map((btn: any) => (
          <RN.TouchableOpacity
            key={btn.value}
            testID={`competition-${btn.value}`}
            onPress={() => onValueChange(btn.value)}
          >
            <RN.Text>{btn.label}</RN.Text>
            {value === btn.value && <RN.Text testID={`${btn.value}-selected`}>Selected</RN.Text>}
          </RN.TouchableOpacity>
        ))}
      </RN.View>
    ),
    RadioButton: {
      Group: ({ onValueChange, value, children }: any) => (
        <RN.View testID="radio-group">{children}</RN.View>
      ),
      Item: ({ label, value, testID }: any) => (
        <RN.TouchableOpacity testID={testID}>
          <RN.Text>{label}</RN.Text>
        </RN.TouchableOpacity>
      ),
    },
    Button: ({ children, onPress, loading, disabled, testID }: any) => (
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
    HelperText: ({ children, type, visible }: any) => (
      visible ? <RN.Text testID={`helper-${type}`}>{children}</RN.Text> : null
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        error: '#FF0000',
      },
    }),
  };
});

// Mock error utils
jest.mock('@utils/errorUtils', () => ({
  getErrorMessage: (error: any) => error?.message || 'Unknown error',
}));

const mockUseGroupsStore = useGroupsStore as jest.MockedFunction<typeof useGroupsStore>;

describe('CreateGroupScreen', () => {
  const mockCreateGroup = jest.fn();

  const createMockGroup = (overrides: Partial<Group> = {}): Group => ({
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    competition_type: 'weekly',
    is_private: false,
    member_count: 1,
    max_members: 5,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const defaultGroupsState = {
    isLoading: false,
    createGroup: mockCreateGroup,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGroupsStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(defaultGroupsState);
      }
      return defaultGroupsState;
    });

    mockCreateGroup.mockResolvedValue(createMockGroup());
  });

  describe('initial render', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('appbar-header')).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('appbar-title')).toHaveTextContent('Create Group');
    });

    it('should render group name input', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('group-name-input')).toBeTruthy();
    });

    it('should render description input', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('group-description-input')).toBeTruthy();
    });

    it('should render competition type buttons', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('competition-daily')).toBeTruthy();
      expect(getByTestId('competition-weekly')).toBeTruthy();
      expect(getByTestId('competition-monthly')).toBeTruthy();
    });

    it('should render privacy options', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('privacy-public-radio')).toBeTruthy();
      expect(getByTestId('privacy-private-radio')).toBeTruthy();
    });

    it('should render create button', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('create-group-button')).toBeTruthy();
    });

    it('should have weekly competition type selected by default', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('weekly-selected')).toBeTruthy();
    });

    it('should render empty name input initially', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      const input = getByTestId('group-name-input-field');
      expect(input.props.value).toBe('');
    });

    it('should render empty description input initially', () => {
      const { getByTestId } = render(<CreateGroupScreen />);
      const input = getByTestId('group-description-input-field');
      expect(input.props.value).toBe('');
    });
  });

  describe('group name validation', () => {
    it('should show error when name is empty on blur', () => {
      const { getByTestId, queryByText } = render(<CreateGroupScreen />);
      const input = getByTestId('group-name-input-field');

      fireEvent(input, 'blur');

      expect(queryByText('Group name is required')).toBeTruthy();
    });

    it('should show error when name is less than 3 characters', () => {
      const { getByTestId, queryByText } = render(<CreateGroupScreen />);
      const input = getByTestId('group-name-input-field');

      fireEvent.changeText(input, 'AB');
      fireEvent(input, 'blur');

      expect(queryByText('Group name must be at least 3 characters')).toBeTruthy();
    });

    it('should show error when name is more than 50 characters', () => {
      const { getByTestId, queryByText } = render(<CreateGroupScreen />);
      const input = getByTestId('group-name-input-field');

      fireEvent.changeText(input, 'A'.repeat(51));
      fireEvent(input, 'blur');

      expect(queryByText('Group name must be at most 50 characters')).toBeTruthy();
    });

    it('should accept valid name between 3-50 characters', () => {
      const { getByTestId, queryByText } = render(<CreateGroupScreen />);
      const input = getByTestId('group-name-input-field');

      fireEvent.changeText(input, 'Valid Group Name');
      fireEvent(input, 'blur');

      expect(queryByText('Group name is required')).toBeNull();
      expect(queryByText('Group name must be at least 3 characters')).toBeNull();
      expect(queryByText('Group name must be at most 50 characters')).toBeNull();
    });
  });

  describe('description validation', () => {
    it('should show error when description exceeds 500 characters', () => {
      const { getByTestId, queryByText } = render(<CreateGroupScreen />);
      const input = getByTestId('group-description-input-field');

      fireEvent.changeText(input, 'A'.repeat(501));
      fireEvent(input, 'blur');

      expect(queryByText('Description must be at most 500 characters')).toBeTruthy();
    });

    it('should accept empty description', () => {
      const { getByTestId, queryByText } = render(<CreateGroupScreen />);
      const input = getByTestId('group-description-input-field');

      fireEvent.changeText(input, '');
      fireEvent(input, 'blur');

      expect(queryByText('Description must be at most 500 characters')).toBeNull();
    });

    it('should accept valid description under 500 characters', () => {
      const { getByTestId, queryByText } = render(<CreateGroupScreen />);
      const input = getByTestId('group-description-input-field');

      fireEvent.changeText(input, 'A valid description');
      fireEvent(input, 'blur');

      expect(queryByText('Description must be at most 500 characters')).toBeNull();
    });
  });

  describe('competition type selection', () => {
    it('should change to daily when daily is pressed', () => {
      const { getByTestId, queryByTestId } = render(<CreateGroupScreen />);

      fireEvent.press(getByTestId('competition-daily'));

      expect(getByTestId('daily-selected')).toBeTruthy();
      expect(queryByTestId('weekly-selected')).toBeNull();
    });

    it('should change to monthly when monthly is pressed', () => {
      const { getByTestId, queryByTestId } = render(<CreateGroupScreen />);

      fireEvent.press(getByTestId('competition-monthly'));

      expect(getByTestId('monthly-selected')).toBeTruthy();
      expect(queryByTestId('weekly-selected')).toBeNull();
    });
  });

  describe('form submission', () => {
    it('should not submit when name is invalid', async () => {
      const { getByTestId } = render(<CreateGroupScreen />);

      fireEvent.press(getByTestId('create-group-button'));

      await waitFor(() => {
        expect(mockCreateGroup).not.toHaveBeenCalled();
      });
    });

    it('should call createGroup with correct data when form is valid', async () => {
      const { getByTestId } = render(<CreateGroupScreen />);

      fireEvent.changeText(getByTestId('group-name-input-field'), 'My New Group');
      fireEvent.changeText(getByTestId('group-description-input-field'), 'A great group');
      fireEvent.press(getByTestId('competition-daily'));
      fireEvent.press(getByTestId('create-group-button'));

      await waitFor(() => {
        expect(mockCreateGroup).toHaveBeenCalledWith({
          name: 'My New Group',
          description: 'A great group',
          competition_type: 'daily',
          is_private: false,
        });
      });
    });

    it('should navigate to GroupDetail on successful creation', async () => {
      const mockGroup = createMockGroup({ id: 'new-group-id' });
      mockCreateGroup.mockResolvedValueOnce(mockGroup);

      const { getByTestId } = render(<CreateGroupScreen />);

      fireEvent.changeText(getByTestId('group-name-input-field'), 'My New Group');
      fireEvent.press(getByTestId('create-group-button'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('GroupDetail', { groupId: 'new-group-id' });
      });
    });

    it('should show error alert on API failure', async () => {
      mockCreateGroup.mockRejectedValueOnce(new Error('Network error'));

      const { getByTestId } = render(<CreateGroupScreen />);

      fireEvent.changeText(getByTestId('group-name-input-field'), 'My New Group');
      fireEvent.press(getByTestId('create-group-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });

    it('should trim whitespace from name and description', async () => {
      const { getByTestId } = render(<CreateGroupScreen />);

      fireEvent.changeText(getByTestId('group-name-input-field'), '  Trimmed Name  ');
      fireEvent.changeText(getByTestId('group-description-input-field'), '  Trimmed Description  ');
      fireEvent.press(getByTestId('create-group-button'));

      await waitFor(() => {
        expect(mockCreateGroup).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Trimmed Name',
            description: 'Trimmed Description',
          })
        );
      });
    });

    it('should pass undefined for empty description', async () => {
      const { getByTestId } = render(<CreateGroupScreen />);

      fireEvent.changeText(getByTestId('group-name-input-field'), 'My New Group');
      fireEvent.changeText(getByTestId('group-description-input-field'), '');
      fireEvent.press(getByTestId('create-group-button'));

      await waitFor(() => {
        expect(mockCreateGroup).toHaveBeenCalledWith(
          expect.objectContaining({
            description: undefined,
          })
        );
      });
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when submitting', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<CreateGroupScreen />);
      expect(getByTestId('create-group-button-loading')).toBeTruthy();
    });

    it('should disable button when loading', () => {
      mockUseGroupsStore.mockImplementation((selector?: any) => {
        const state = {
          ...defaultGroupsState,
          isLoading: true,
        };
        return selector ? selector(state) : state;
      });

      const { getByTestId } = render(<CreateGroupScreen />);
      const button = getByTestId('create-group-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByTestId } = render(<CreateGroupScreen />);

      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
