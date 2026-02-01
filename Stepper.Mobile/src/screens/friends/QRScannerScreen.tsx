import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { IconButton, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FriendsStackParamList } from '@navigation/types';
import { friendsApi } from '@services/api/friendsApi';
import { useFriendsStore } from '@store/friendsStore';
import { getErrorMessage } from '@utils/errorUtils';
import { track } from '@services/analytics';

type NavigationProp = NativeStackNavigationProp<FriendsStackParamList, 'QRScanner'>;

/**
 * QR Scanner screen for scanning friend's QR codes.
 * Uses expo-camera for barcode scanning.
 */
export default function QRScannerScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanned, setScanned] = useState(false);
  const hasTrackedOpen = useRef(false);

  const { sendRequest } = useFriendsStore();

  // Track QR scanner opened event
  useEffect(() => {
    if (!hasTrackedOpen.current) {
      track('qr_scanner_used', {});
      hasTrackedOpen.current = true;
    }
  }, []);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleFlash = useCallback(() => {
    setFlashEnabled((prev) => !prev);
  }, []);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanned || isProcessing) return;

      const { data } = result;

      // Check if the scanned data looks like a valid user ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data)) {
        // Not a valid user ID format, ignore
        return;
      }

      setScanned(true);
      setIsProcessing(true);

      try {
        // Check if user exists
        const user = await friendsApi.getUserById(data);

        if (!user) {
          Alert.alert('User Not Found', 'The scanned QR code is not valid.', [
            { text: 'OK', onPress: () => setScanned(false) },
          ]);
          setIsProcessing(false);
          return;
        }

        // Check existing friendship status
        const status = await friendsApi.checkFriendshipStatus(data);

        if (status === 'accepted') {
          Alert.alert(
            'Already Friends',
            `You are already friends with ${user.display_name}.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          setIsProcessing(false);
          return;
        }

        if (status === 'pending_sent') {
          Alert.alert(
            'Request Pending',
            `You have already sent a friend request to ${user.display_name}.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          setIsProcessing(false);
          return;
        }

        if (status === 'pending_received') {
          Alert.alert(
            'Request Received',
            `${user.display_name} has already sent you a friend request. Check your friend requests!`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          setIsProcessing(false);
          return;
        }

        // Send friend request
        Alert.alert(
          'Add Friend',
          `Send a friend request to ${user.display_name}?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setScanned(false);
                setIsProcessing(false);
              },
            },
            {
              text: 'Send Request',
              onPress: async () => {
                try {
                  await sendRequest(data);
                  Alert.alert(
                    'Request Sent',
                    `Friend request sent to ${user.display_name}!`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                  );
                } catch (error) {
                  Alert.alert('Error', getErrorMessage(error), [
                    { text: 'OK', onPress: () => setScanned(false) },
                  ]);
                } finally {
                  setIsProcessing(false);
                }
              },
            },
          ]
        );
      } catch (error) {
        const message = getErrorMessage(error);
        if (message === 'Cannot add yourself as a friend') {
          Alert.alert('Error', "You can't add yourself as a friend!", [
            { text: 'OK', onPress: () => setScanned(false) },
          ]);
        } else {
          Alert.alert('Error', message, [
            { text: 'OK', onPress: () => setScanned(false) },
          ]);
        }
        setIsProcessing(false);
      }
    },
    [scanned, isProcessing, navigation, sendRequest]
  );

  // Permission loading state
  if (!permission) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={handleClose}
            iconColor={theme.colors.onSurface}
          />
        </View>
        <View style={styles.permissionContainer}>
          <Text
            variant="headlineSmall"
            style={[styles.permissionTitle, { color: theme.colors.onSurface }]}
          >
            Camera Permission Required
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.permissionText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            We need camera access to scan QR codes. Please grant camera permission
            in your device settings.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        <SafeAreaView style={styles.overlay}>
          <View style={styles.header}>
            <IconButton
              icon="close"
              size={28}
              onPress={handleClose}
              iconColor="#FFFFFF"
              style={styles.headerButton}
            />
            <View style={{ flex: 1 }} />
            <IconButton
              icon={flashEnabled ? 'flash' : 'flash-off'}
              size={28}
              onPress={toggleFlash}
              iconColor="#FFFFFF"
              style={styles.headerButton}
            />
          </View>

          <View style={styles.scannerContainer}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <View style={styles.footer}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text variant="bodyLarge" style={styles.instructionText}>
                Point camera at friend's QR code
              </Text>
            )}
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  headerButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  permissionText: {
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  footer: {
    paddingBottom: 48,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
