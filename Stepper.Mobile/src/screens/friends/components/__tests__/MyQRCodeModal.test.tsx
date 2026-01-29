import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { MyQRCodeModal } from '../MyQRCodeModal';
import { useUserStore } from '@store/userStore';

// Mock user store
jest.mock('@store/userStore');
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Modal: ({ children, visible, onDismiss, contentContainerStyle, ...props }: any) => {
      if (!visible) return null;
      return (
        <RN.View testID="modal" style={contentContainerStyle} {...props}>
          {children}
        </RN.View>
      );
    },
    Portal: ({ children }: any) => children,
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    Button: ({ children, mode, onPress, icon, style, disabled, loading, ...props }: any) => (
      <RN.TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        testID={`button-${icon || 'default'}`}
        {...props}
      >
        <RN.Text>{loading ? 'Loading...' : children}</RN.Text>
      </RN.TouchableOpacity>
    ),
    IconButton: ({ icon, onPress, iconColor, size, ...props }: any) => (
      <RN.TouchableOpacity
        onPress={onPress}
        testID={`icon-button-${icon}`}
        {...props}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        outlineVariant: '#E0E0E0',
      },
    }),
  };
});

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const RN = require('react-native');
  return ({ value, size, backgroundColor, color, getRef, ...props }: any) => {
    // Simulate the ref with toDataURL
    if (getRef) {
      getRef({
        toDataURL: (callback: (data: string) => void) => {
          callback('base64-mock-data');
        },
      });
    }
    return (
      <RN.View testID="qr-code" {...props}>
        <RN.Text>{value}</RN.Text>
      </RN.View>
    );
  };
});

// Mock expo-media-library
const mockRequestPermissionsAsync = jest.fn();
const mockSaveToLibraryAsync = jest.fn();
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  saveToLibraryAsync: (uri: string) => mockSaveToLibraryAsync(uri),
}));

// Mock expo-file-system/legacy
const mockWriteAsStringAsync = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/mock/cache/',
  writeAsStringAsync: (fileUri: string, data: string, options: any) =>
    mockWriteAsStringAsync(fileUri, data, options),
  EncodingType: {
    Base64: 'base64',
  },
}));

// Mock expo-sharing
const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: (uri: string, options: any) => mockShareAsync(uri, options),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MyQRCodeModal', () => {
  const mockUser = {
    id: 'user-123-uuid',
    email: 'test@example.com',
    display_name: 'Test User',
    username: 'testuser',
    preferences: {
      id: 'user-123-uuid',
      units: 'metric' as const,
      daily_step_goal: 10000,
      notifications_enabled: true,
      privacy_find_me: 'public' as const,
      privacy_show_steps: 'partial' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    created_at: '2024-01-01T00:00:00Z',
    onboarding_completed: true,
  };

  const defaultProps = {
    visible: true,
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserStore.mockReturnValue({ currentUser: mockUser });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockWriteAsStringAsync.mockResolvedValue(undefined);
    mockSaveToLibraryAsync.mockResolvedValue(undefined);
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <MyQRCodeModal {...defaultProps} visible={false} />
      );
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should return null when currentUser is null', () => {
      mockUseUserStore.mockReturnValue({ currentUser: null });
      const { queryByTestId } = render(<MyQRCodeModal {...defaultProps} />);
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should render the title "My QR Code"', () => {
      const { getByText } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByText('My QR Code')).toBeTruthy();
    });

    it('should render the close button', () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByTestId('icon-button-close')).toBeTruthy();
    });

    it('should render the QR code', () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByTestId('qr-code')).toBeTruthy();
    });

    it('should render the QR code with user ID as value', () => {
      const { getByText } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByText('user-123-uuid')).toBeTruthy();
    });

    it('should render the user display name', () => {
      const { getByText } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByText('Test User')).toBeTruthy();
    });

    it('should render the instruction text', () => {
      const { getByText } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByText('Share this code with friends to connect instantly')).toBeTruthy();
    });

    it('should render Save to Photos button', () => {
      const { getByText } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByText('Save to Photos')).toBeTruthy();
    });

    it('should render Share Code button', () => {
      const { getByText } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByText('Share Code')).toBeTruthy();
    });
  });

  describe('close button', () => {
    it('should call onDismiss when close button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = render(
        <MyQRCodeModal {...defaultProps} onDismiss={onDismiss} />
      );

      fireEvent.press(getByTestId('icon-button-close'));

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('save to photos', () => {
    it('should request permission when Save to Photos is pressed', async () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-download'));
      });

      await waitFor(() => {
        expect(mockRequestPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should save to library after permission granted', async () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-download'));
      });

      await waitFor(() => {
        expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
          '/mock/cache/stepper_qr_code.png',
          'base64-mock-data',
          { encoding: 'base64' }
        );
        expect(mockSaveToLibraryAsync).toHaveBeenCalledWith(
          '/mock/cache/stepper_qr_code.png'
        );
      });
    });

    it('should show success alert after saving', async () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-download'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Saved',
          'QR code saved to your photos!'
        );
      });
    });

    it('should show permission required alert when permission denied', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-download'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          'Please grant photo library access to save the QR code.'
        );
      });
    });

    it('should show error alert when save fails', async () => {
      mockWriteAsStringAsync.mockRejectedValue(new Error('Write failed'));

      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-download'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Write failed');
      });
    });
  });

  describe('share', () => {
    it('should check if sharing is available when Share is pressed', async () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-share-variant'));
      });

      await waitFor(() => {
        expect(mockIsAvailableAsync).toHaveBeenCalled();
      });
    });

    it('should share file when sharing is available', async () => {
      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-share-variant'));
      });

      await waitFor(() => {
        expect(mockWriteAsStringAsync).toHaveBeenCalled();
        expect(mockShareAsync).toHaveBeenCalledWith(
          '/mock/cache/stepper_qr_code.png',
          {
            mimeType: 'image/png',
            dialogTitle: 'Share QR Code',
            UTI: 'public.png',
          }
        );
      });
    });

    it('should show error alert when sharing is not available', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);

      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-share-variant'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Sharing is not available on this device.'
        );
      });
    });

    it('should show error alert when share fails', async () => {
      mockShareAsync.mockRejectedValue(new Error('Share failed'));

      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-share-variant'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Share failed');
      });
    });
  });

  describe('fallback display name', () => {
    it('should show "User" when display_name is not set', () => {
      mockUseUserStore.mockReturnValue({
        currentUser: { ...mockUser, display_name: undefined },
      });

      const { getByText } = render(<MyQRCodeModal {...defaultProps} />);
      expect(getByText('User')).toBeTruthy();
    });
  });

  describe('button states', () => {
    it('should disable buttons while saving', async () => {
      let resolvePromise: () => void;
      mockWriteAsStringAsync.mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-download'));
      });

      // Both buttons should be disabled while saving
      const downloadButton = getByTestId('button-download');
      const shareButton = getByTestId('button-share-variant');
      expect(downloadButton.props.disabled).toBe(true);
      expect(shareButton.props.disabled).toBe(true);

      await act(async () => {
        resolvePromise!();
      });
    });

    it('should disable buttons while sharing', async () => {
      let resolvePromise: () => void;
      mockShareAsync.mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { getByTestId } = render(<MyQRCodeModal {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('button-share-variant'));
      });

      // Both buttons should be disabled while sharing
      const downloadButton = getByTestId('button-download');
      const shareButton = getByTestId('button-share-variant');
      expect(downloadButton.props.disabled).toBe(true);
      expect(shareButton.props.disabled).toBe(true);

      await act(async () => {
        resolvePromise!();
      });
    });
  });
});
