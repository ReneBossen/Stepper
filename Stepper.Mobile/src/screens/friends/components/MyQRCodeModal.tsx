import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  IconButton,
  useTheme,
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useUserStore } from '@store/userStore';
import { getErrorMessage } from '@utils/errorUtils';

interface MyQRCodeModalProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Modal displaying the current user's QR code for friends to scan.
 * Supports saving to photos and sharing.
 */
export function MyQRCodeModal({ visible, onDismiss }: MyQRCodeModalProps) {
  const theme = useTheme();
  const { currentUser } = useUserStore();
  const qrRef = useRef<QRCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const userId = currentUser?.id ?? '';
  const displayName = currentUser?.display_name ?? 'User';

  const getQRDataURL = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!qrRef.current) {
        reject(new Error('QR code not ready'));
        return;
      }

      // Use type assertion since the library types don't include toDataURL
      const qrCodeRef = qrRef.current as unknown as {
        toDataURL: (callback: (data: string) => void) => void;
      };

      qrCodeRef.toDataURL((data: string) => {
        resolve(data);
      });
    });
  }, []);

  const handleSaveToPhotos = useCallback(async () => {
    setIsSaving(true);
    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to save the QR code.'
        );
        setIsSaving(false);
        return;
      }

      // Get QR code as base64
      const base64Data = await getQRDataURL();

      // Create a temporary file
      const fileUri = `${FileSystemLegacy.cacheDirectory}stepper_qr_code.png`;
      await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(fileUri);

      Alert.alert('Saved', 'QR code saved to your photos!');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [getQRDataURL]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        setIsSharing(false);
        return;
      }

      // Get QR code as base64
      const base64Data = await getQRDataURL();

      // Create a temporary file
      const fileUri = `${FileSystemLegacy.cacheDirectory}stepper_qr_code.png`;
      await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share QR Code',
        UTI: 'public.png',
      });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSharing(false);
    }
  }, [getQRDataURL]);

  if (!currentUser) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            My QR Code
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
          />
        </View>

        <View style={styles.qrContainer}>
          <View
            style={[
              styles.qrBackground,
              { backgroundColor: '#FFFFFF', borderColor: theme.colors.outlineVariant },
            ]}
          >
            <QRCode
              value={userId}
              size={200}
              backgroundColor="#FFFFFF"
              color="#000000"
              getRef={(ref) => (qrRef.current = ref)}
            />
          </View>
        </View>

        <Text
          variant="titleMedium"
          style={[styles.displayName, { color: theme.colors.onSurface }]}
        >
          {displayName}
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.instruction, { color: theme.colors.onSurfaceVariant }]}
        >
          Share this code with friends to connect instantly
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleSaveToPhotos}
            icon="download"
            style={styles.button}
            disabled={isSaving || isSharing}
            loading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save to Photos'}
          </Button>

          <Button
            mode="contained"
            onPress={handleShare}
            icon="share-variant"
            style={styles.button}
            disabled={isSaving || isSharing}
            loading={isSharing}
          >
            {isSharing ? 'Sharing...' : 'Share Code'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  qrBackground: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  displayName: {
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
  instruction: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
});
