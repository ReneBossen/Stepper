import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DataExportModal } from '../DataExportModal';

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock-cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: {
    UTF8: 'utf8',
  },
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// Mock usersApi
jest.mock('@services/api/usersApi', () => ({
  usersApi: {
    downloadMyData: jest.fn(),
  },
}));

// Mock analytics
jest.mock('@services/analytics', () => ({
  track: jest.fn(),
}));

// Import mocks after jest.mock declarations
import * as Sharing from 'expo-sharing';
import { usersApi } from '@services/api/usersApi';
import { track } from '@services/analytics';

// Type cast the mocks
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockDownloadMyData = usersApi.downloadMyData as jest.Mock;
const mockTrack = track as jest.Mock;

// Mock errorUtils
jest.mock('@utils/errorUtils', () => ({
  getErrorMessage: (error: Error) => error.message || 'An error occurred',
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RN = require('react-native');

  return {
    Modal: ({ visible, onDismiss, children, contentContainerStyle }: any) =>
      visible
        ? React.createElement(RN.View, { testID: 'modal', style: contentContainerStyle }, children)
        : null,
    Portal: ({ children }: any) =>
      React.createElement(RN.View, { testID: 'portal' }, children),
    Text: ({ children, variant, style }: any) =>
      React.createElement(RN.Text, { style, testID: `text-${variant}` }, children),
    Button: ({ children, onPress, loading, disabled, testID, mode, icon }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { testID, onPress, disabled: disabled || loading },
        React.createElement(RN.Text, { testID: `${testID}-text` }, children),
        loading ? React.createElement(RN.View, { testID: `${testID}-loading` }) : null
      ),
    IconButton: ({ icon, onPress, testID, size, iconColor, style }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { testID, onPress },
        React.createElement(RN.Text, null, icon)
      ),
    ActivityIndicator: ({ size, color }: any) =>
      React.createElement(RN.View, { testID: 'activity-indicator' }),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        error: '#FF0000',
      },
    }),
  };
});

describe('DataExportModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnExported = jest.fn();

  const defaultProps = {
    visible: true,
    onDismiss: mockOnDismiss,
    onExported: mockOnExported,
  };

  const mockExportData = {
    exportMetadata: {
      exportedAt: '2026-02-01T12:00:00Z',
      userId: '123',
      dataFormat: 'stepper_export_v1',
    },
    profile: {
      id: '123',
      email: 'user@example.com',
      displayName: 'Test User',
      avatarUrl: null,
      qrCodeId: 'abc123',
      onboardingCompleted: true,
      createdAt: '2025-01-01T00:00:00Z',
    },
    preferences: {
      dailyStepGoal: 10000,
      units: 'metric',
      notificationsEnabled: true,
      notifyDailyReminder: true,
      notifyFriendRequests: true,
      notifyGroupInvites: true,
      notifyAchievements: true,
      privacyProfileVisibility: 'public',
      privacyFindMe: 'public',
      privacyShowSteps: 'partial',
    },
    stepHistory: [],
    friendships: [],
    groupMemberships: [],
    activityFeed: [],
    notifications: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadMyData.mockResolvedValue(mockExportData);
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <DataExportModal {...defaultProps} visible={false} />
      );
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should display title', () => {
      const { getByText } = render(<DataExportModal {...defaultProps} />);
      expect(getByText('Download My Data')).toBeTruthy();
    });

    it('should display close button when not exporting', () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);
      expect(getByTestId('data-export-modal-close')).toBeTruthy();
    });

    it('should display export button', () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);
      expect(getByTestId('data-export-button')).toBeTruthy();
    });

    it('should display cancel button', () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);
      expect(getByTestId('data-export-cancel-button')).toBeTruthy();
    });

    it('should display data categories list', () => {
      const { getByText } = render(<DataExportModal {...defaultProps} />);
      expect(getByText('Profile information')).toBeTruthy();
      expect(getByText('Your preferences and settings')).toBeTruthy();
      expect(getByText('Step history')).toBeTruthy();
      expect(getByText('Friends and social connections')).toBeTruthy();
      expect(getByText('Group memberships')).toBeTruthy();
      expect(getByText('Notifications')).toBeTruthy();
    });
  });

  describe('export functionality', () => {
    it('should show loading state when exporting', async () => {
      // Make the download hang to keep loading state visible
      mockDownloadMyData.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(getByTestId('activity-indicator')).toBeTruthy();
      });
    });

    it('should call downloadMyData API when export button is pressed', async () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(mockDownloadMyData).toHaveBeenCalled();
      });
    });

    it('should share file after successful export', async () => {
      const FileSystem = require('expo-file-system/legacy');

      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
        expect(mockShareAsync).toHaveBeenCalled();
      });
    });

    it('should call onExported callback on success', async () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(mockOnExported).toHaveBeenCalled();
      });
    });

    it('should call onDismiss after successful export', async () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('should track analytics event when export starts', async () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith('data_export_requested', {
          export_status: 'started',
        });
      });
    });

    it('should track analytics event when export completes', async () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith('data_export_requested', {
          export_status: 'completed',
        });
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when API call fails', async () => {
      mockDownloadMyData.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
      });
    });

    it('should display retry button when error occurs', async () => {
      mockDownloadMyData.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(getByTestId('data-export-retry-button')).toBeTruthy();
      });
    });

    it('should retry export when retry button is pressed', async () => {
      mockDownloadMyData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockExportData);

      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(getByTestId('data-export-retry-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('data-export-retry-button'));

      await waitFor(() => {
        expect(mockDownloadMyData).toHaveBeenCalledTimes(2);
      });
    });

    it('should track analytics event when export fails', async () => {
      mockDownloadMyData.mockRejectedValue(new Error('API error'));

      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith('data_export_requested', {
          export_status: 'failed',
          error_message: 'API error',
        });
      });
    });

    it('should display error when sharing is not available', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);

      const { getByTestId, getByText } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(getByText('Sharing is not available on this device')).toBeTruthy();
      });
    });
  });

  describe('dismiss functionality', () => {
    it('should call onDismiss when close button is pressed', () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-modal-close'));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should call onDismiss when cancel button is pressed', () => {
      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-cancel-button'));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should call onDismiss when cancel is pressed in error state', async () => {
      mockDownloadMyData.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<DataExportModal {...defaultProps} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(getByTestId('data-export-cancel-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('data-export-cancel-button'));

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('onExported callback', () => {
    it('should work without onExported callback', async () => {
      const propsWithoutCallback = {
        visible: true,
        onDismiss: mockOnDismiss,
      };

      const { getByTestId } = render(<DataExportModal {...propsWithoutCallback} />);

      fireEvent.press(getByTestId('data-export-button'));

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });
  });
});
