/**
 * Mock for expo-image-picker used in tests
 */

export const PermissionStatus = {
  UNDETERMINED: 'undetermined',
  GRANTED: 'granted',
  DENIED: 'denied',
};

export const MediaType = {
  Images: 'Images',
  Videos: 'Videos',
  All: 'All',
};

export const requestMediaLibraryPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: PermissionStatus.GRANTED,
    granted: true,
    expires: 'never',
    canAskAgain: true,
  })
);

export const requestCameraPermissionsAsync = jest.fn(() =>
  Promise.resolve({
    status: PermissionStatus.GRANTED,
    granted: true,
    expires: 'never',
    canAskAgain: true,
  })
);

export const launchImageLibraryAsync = jest.fn(() =>
  Promise.resolve({
    canceled: false,
    assets: [
      {
        uri: 'file://mock-image.jpg',
        width: 100,
        height: 100,
        type: 'image',
        fileName: 'mock-image.jpg',
        fileSize: 1000,
      },
    ],
  })
);

export const launchCameraAsync = jest.fn(() =>
  Promise.resolve({
    canceled: false,
    assets: [
      {
        uri: 'file://mock-camera-image.jpg',
        width: 100,
        height: 100,
        type: 'image',
        fileName: 'mock-camera-image.jpg',
        fileSize: 1000,
      },
    ],
  })
);
