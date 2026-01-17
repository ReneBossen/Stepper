import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { PermissionStatus } from '../components/PermissionCard';

export interface PermissionsState {
  notificationPermissionStatus: PermissionStatus;
  requestNotificationPermission: () => Promise<void>;
}

export function usePermissions(): PermissionsState {
  const [notificationPermissionStatus, setNotificationPermissionStatus] =
    useState<PermissionStatus>('undetermined');

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationPermissionStatus(
      status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined'
    );
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationPermissionStatus(
      status === 'granted' ? 'granted' : 'denied'
    );
  };

  return {
    notificationPermissionStatus,
    requestNotificationPermission,
  };
}
