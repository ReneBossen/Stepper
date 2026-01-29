import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import QRScannerScreen from '../QRScannerScreen';
import { friendsApi } from '@services/api/friendsApi';
import { useFriendsStore } from '@store/friendsStore';

// Mock dependencies
jest.mock('@services/api/friendsApi');
jest.mock('@store/friendsStore');

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock expo-camera
const mockUseCameraPermissions = jest.fn();
const mockRequestPermission = jest.fn();
jest.mock('expo-camera', () => ({
  CameraView: ({ children, onBarcodeScanned, enableTorch, style, ...props }: any) => {
    const RN = require('react-native');
    // Store the callback for testing
    (global as any).__mockOnBarcodeScanned = onBarcodeScanned;
    (global as any).__mockEnableTorch = enableTorch;
    return (
      <RN.View testID="camera-view" style={style} {...props}>
        {children}
      </RN.View>
    );
  },
  useCameraPermissions: () => mockUseCameraPermissions(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style, ...props }: any) => {
    const RN = require('react-native');
    return (
      <RN.View testID="safe-area-view" style={style} {...props}>
        {children}
      </RN.View>
    );
  },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    IconButton: ({ icon, onPress, iconColor, size, style, ...props }: any) => (
      <RN.TouchableOpacity
        onPress={onPress}
        testID={`icon-button-${icon}`}
        style={style}
        {...props}
      >
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    ActivityIndicator: ({ size, color, ...props }: any) => (
      <RN.View testID="activity-indicator" {...props} />
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockFriendsApi = friendsApi as jest.Mocked<typeof friendsApi>;
const mockUseFriendsStore = useFriendsStore as jest.MockedFunction<typeof useFriendsStore>;

describe('QRScannerScreen', () => {
  const mockSendRequest = jest.fn();

  const mockUser = {
    id: 'scanned-user-id',
    display_name: 'Scanned User',
    username: 'scanneduser',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__mockOnBarcodeScanned = null;
    (global as any).__mockEnableTorch = false;

    mockUseFriendsStore.mockReturnValue({
      sendRequest: mockSendRequest,
    });

    mockFriendsApi.getUserById.mockResolvedValue(mockUser);
    mockFriendsApi.checkFriendshipStatus.mockResolvedValue('none');
    mockSendRequest.mockResolvedValue(undefined);

    // Default: permission granted
    mockUseCameraPermissions.mockReturnValue([
      { granted: true, canAskAgain: true },
      mockRequestPermission,
    ]);
    mockRequestPermission.mockResolvedValue({ granted: true });
  });

  describe('permission states', () => {
    it('should show loading indicator when permission is null', () => {
      mockUseCameraPermissions.mockReturnValue([null, mockRequestPermission]);

      const { getByTestId } = render(<QRScannerScreen />);

      expect(getByTestId('activity-indicator')).toBeTruthy();
    });

    it('should request permission when not granted but can ask', () => {
      mockUseCameraPermissions.mockReturnValue([
        { granted: false, canAskAgain: true },
        mockRequestPermission,
      ]);

      render(<QRScannerScreen />);

      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should show permission denied message when permission not granted', () => {
      mockUseCameraPermissions.mockReturnValue([
        { granted: false, canAskAgain: false },
        mockRequestPermission,
      ]);

      const { getByText } = render(<QRScannerScreen />);

      expect(getByText('Camera Permission Required')).toBeTruthy();
      expect(getByText(/We need camera access to scan QR codes/)).toBeTruthy();
    });

    it('should show close button in permission denied state', () => {
      mockUseCameraPermissions.mockReturnValue([
        { granted: false, canAskAgain: false },
        mockRequestPermission,
      ]);

      const { getByTestId } = render(<QRScannerScreen />);

      expect(getByTestId('icon-button-close')).toBeTruthy();
    });

    it('should call goBack when close is pressed in permission denied state', () => {
      mockUseCameraPermissions.mockReturnValue([
        { granted: false, canAskAgain: false },
        mockRequestPermission,
      ]);

      const { getByTestId } = render(<QRScannerScreen />);

      fireEvent.press(getByTestId('icon-button-close'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('camera view', () => {
    it('should render camera when permission granted', () => {
      const { getByTestId } = render(<QRScannerScreen />);

      expect(getByTestId('camera-view')).toBeTruthy();
    });

    it('should render close button', () => {
      const { getByTestId } = render(<QRScannerScreen />);

      expect(getByTestId('icon-button-close')).toBeTruthy();
    });

    it('should render flash toggle button', () => {
      const { getByTestId } = render(<QRScannerScreen />);

      expect(getByTestId('icon-button-flash-off')).toBeTruthy();
    });

    it('should render instruction text', () => {
      const { getByText } = render(<QRScannerScreen />);

      expect(getByText("Point camera at friend's QR code")).toBeTruthy();
    });

    it('should call goBack when close button is pressed', () => {
      const { getByTestId } = render(<QRScannerScreen />);

      fireEvent.press(getByTestId('icon-button-close'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('flash toggle', () => {
    it('should toggle flash when flash button is pressed', () => {
      const { getByTestId, queryByTestId } = render(<QRScannerScreen />);

      // Initially flash is off
      expect(getByTestId('icon-button-flash-off')).toBeTruthy();
      expect(queryByTestId('icon-button-flash')).toBeNull();

      // Toggle flash on
      fireEvent.press(getByTestId('icon-button-flash-off'));

      // Now flash should be on
      expect(getByTestId('icon-button-flash')).toBeTruthy();
      expect(queryByTestId('icon-button-flash-off')).toBeNull();
    });

    it('should toggle flash back off', () => {
      const { getByTestId } = render(<QRScannerScreen />);

      // Toggle on
      fireEvent.press(getByTestId('icon-button-flash-off'));
      // Toggle off
      fireEvent.press(getByTestId('icon-button-flash'));

      expect(getByTestId('icon-button-flash-off')).toBeTruthy();
    });
  });

  describe('barcode scanning', () => {
    it('should ignore non-UUID barcodes', async () => {
      render(<QRScannerScreen />);

      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: 'not-a-uuid' });
      });

      expect(mockFriendsApi.getUserById).not.toHaveBeenCalled();
    });

    it('should process valid UUID barcodes', async () => {
      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(mockFriendsApi.getUserById).toHaveBeenCalledWith(validUUID);
      });
    });

    it('should show alert when user not found', async () => {
      mockFriendsApi.getUserById.mockResolvedValue(null);

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'User Not Found',
          'The scanned QR code is not valid.',
          expect.any(Array)
        );
      });
    });

    it('should show alert when already friends', async () => {
      mockFriendsApi.checkFriendshipStatus.mockResolvedValue('accepted');

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Already Friends',
          'You are already friends with Scanned User.',
          expect.any(Array)
        );
      });
    });

    it('should show alert when request already sent', async () => {
      mockFriendsApi.checkFriendshipStatus.mockResolvedValue('pending_sent');

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Request Pending',
          'You have already sent a friend request to Scanned User.',
          expect.any(Array)
        );
      });
    });

    it('should show alert when request already received', async () => {
      mockFriendsApi.checkFriendshipStatus.mockResolvedValue('pending_received');

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Request Received',
          'Scanned User has already sent you a friend request. Check your friend requests!',
          expect.any(Array)
        );
      });
    });

    it('should show confirmation alert when can add friend', async () => {
      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Add Friend',
          'Send a friend request to Scanned User?',
          expect.any(Array)
        );
      });
    });

    it('should show error when trying to add yourself', async () => {
      mockFriendsApi.getUserById.mockRejectedValue(
        new Error('Cannot add yourself as a friend')
      );

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          "You can't add yourself as a friend!",
          expect.any(Array)
        );
      });
    });

    it('should set scanned state after first valid scan', async () => {
      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      // First scan should process
      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(mockFriendsApi.getUserById).toHaveBeenCalledWith(validUUID);
      });
    });
  });

  describe('processing state', () => {
    it('should show activity indicator while processing', async () => {
      let resolvePromise: (value: any) => void;
      mockFriendsApi.getUserById.mockImplementation(
        () => new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { getByTestId, queryByText } = render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      // Should show activity indicator and hide instruction text
      expect(getByTestId('activity-indicator')).toBeTruthy();
      expect(queryByText("Point camera at friend's QR code")).toBeNull();

      await act(async () => {
        resolvePromise!(mockUser);
      });
    });
  });

  describe('send friend request flow', () => {
    it('should send request when confirmed', async () => {
      let alertCallback: ((result: any) => void) | null = null;

      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          if (title === 'Add Friend') {
            // Find the "Send Request" button and call its onPress
            const sendButton = buttons?.find((b: any) => b.text === 'Send Request');
            if (sendButton) {
              alertCallback = sendButton.onPress;
            }
          }
        }
      );

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(alertCallback).not.toBeNull();
      });

      // Simulate pressing "Send Request"
      await act(async () => {
        await alertCallback!({});
      });

      await waitFor(() => {
        expect(mockSendRequest).toHaveBeenCalledWith(validUUID);
      });
    });

    it('should show success alert after sending request', async () => {
      let alertCallback: ((result: any) => void) | null = null;

      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          if (title === 'Add Friend') {
            const sendButton = buttons?.find((b: any) => b.text === 'Send Request');
            if (sendButton) {
              alertCallback = sendButton.onPress;
            }
          }
        }
      );

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(alertCallback).not.toBeNull();
      });

      // Clear previous alert calls
      (Alert.alert as jest.Mock).mockClear();

      await act(async () => {
        await alertCallback!({});
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Request Sent',
          'Friend request sent to Scanned User!',
          expect.any(Array)
        );
      });
    });

    it('should show error alert if send request fails', async () => {
      mockSendRequest.mockRejectedValue(new Error('Network error'));

      let alertCallback: ((result: any) => void) | null = null;

      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          if (title === 'Add Friend') {
            const sendButton = buttons?.find((b: any) => b.text === 'Send Request');
            if (sendButton) {
              alertCallback = sendButton.onPress;
            }
          }
        }
      );

      render(<QRScannerScreen />);

      const validUUID = '12345678-1234-1234-1234-123456789abc';
      const onBarcodeScanned = (global as any).__mockOnBarcodeScanned;

      await act(async () => {
        onBarcodeScanned({ data: validUUID });
      });

      await waitFor(() => {
        expect(alertCallback).not.toBeNull();
      });

      // Clear previous alert calls
      (Alert.alert as jest.Mock).mockClear();

      await act(async () => {
        await alertCallback!({});
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Network error',
          expect.any(Array)
        );
      });
    });
  });
});
