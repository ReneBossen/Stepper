/**
 * Navigation route constants. Single source of truth for all route names.
 * Organized by stack to match the navigation structure.
 */

export const ROOT_ROUTES = {
  Auth: 'Auth',
  Main: 'Main',
  Onboarding: 'Onboarding',
} as const;

export const AUTH_ROUTES = {
  Login: 'Login',
  Register: 'Register',
  ForgotPassword: 'ForgotPassword',
} as const;

export const ONBOARDING_ROUTES = {
  WelcomeCarousel: 'WelcomeCarousel',
  AnalyticsConsent: 'AnalyticsConsent',
  Permissions: 'Permissions',
  ProfileSetup: 'ProfileSetup',
  PreferencesSetup: 'PreferencesSetup',
} as const;

export const MAIN_ROUTES = {
  Tabs: 'Tabs',
  Notifications: 'Notifications',
} as const;

export const TAB_ROUTES = {
  HomeTab: 'HomeTab',
  StepsTab: 'StepsTab',
  FriendsTab: 'FriendsTab',
  GroupsTab: 'GroupsTab',
  SettingsTab: 'SettingsTab',
} as const;

export const HOME_ROUTES = {
  Home: 'Home',
} as const;

export const STEPS_ROUTES = {
  StepsHistory: 'StepsHistory',
} as const;

export const FRIENDS_ROUTES = {
  FriendsList: 'FriendsList',
  FriendRequests: 'FriendRequests',
  FriendDiscovery: 'FriendDiscovery',
  QRScanner: 'QRScanner',
  UserProfile: 'UserProfile',
} as const;

export const GROUPS_ROUTES = {
  GroupsList: 'GroupsList',
  GroupDetail: 'GroupDetail',
  GroupManagement: 'GroupManagement',
  CreateGroup: 'CreateGroup',
  JoinGroup: 'JoinGroup',
  ManageMembers: 'ManageMembers',
  InviteMembers: 'InviteMembers',
} as const;

export const SETTINGS_ROUTES = {
  Settings: 'Settings',
  Profile: 'Profile',
  EditProfile: 'EditProfile',
  NotificationSettings: 'NotificationSettings',
} as const;
