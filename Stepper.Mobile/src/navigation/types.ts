import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root Navigator
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Onboarding Stack
export type OnboardingStackParamList = {
  WelcomeCarousel: undefined;
  Permissions: undefined;
  ProfileSetup: undefined;
  PreferencesSetup: undefined;
};

// Main Stack (contains tabs + modals)
export type MainStackParamList = {
  Tabs: undefined;
  Notifications: undefined;
};

// Tab Navigator
export type TabParamList = {
  HomeTab: undefined;
  StepsTab: undefined;
  FriendsTab: undefined;
  GroupsTab: undefined;
  SettingsTab: undefined;
};

// Home Stack
export type HomeStackParamList = {
  Home: undefined;
};

// Steps Stack
export type StepsStackParamList = {
  StepsHistory: undefined;
};

// Friends Stack
export type FriendsStackParamList = {
  FriendsList: undefined;
  FriendRequests: undefined;
  FriendDiscovery: undefined;
  QRScanner: undefined;
  UserProfile: { userId: string };
};

// Groups Stack
export type GroupsStackParamList = {
  GroupsList: undefined;
  GroupDetail: { groupId: string };
  GroupManagement: { groupId: string };
  CreateGroup: undefined;
  JoinGroup: { inviteCode?: string };
  ManageMembers: { groupId: string };
  InviteMembers: { groupId: string };
};

// Settings Stack
export type SettingsStackParamList = {
  Settings: undefined;
  Profile: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type OnboardingStackScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainStackScreenProps<T extends keyof MainStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<MainStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  MainStackScreenProps<keyof MainStackParamList>
>;

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<HomeStackParamList, T>,
    TabScreenProps<'HomeTab'>
  >;

export type StepsStackScreenProps<T extends keyof StepsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<StepsStackParamList, T>,
    TabScreenProps<'StepsTab'>
  >;

export type FriendsStackScreenProps<T extends keyof FriendsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<FriendsStackParamList, T>,
    TabScreenProps<'FriendsTab'>
  >;

export type GroupsStackScreenProps<T extends keyof GroupsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<GroupsStackParamList, T>,
    TabScreenProps<'GroupsTab'>
  >;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SettingsStackParamList, T>,
    TabScreenProps<'SettingsTab'>
  >;

// Declare global navigation type
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
