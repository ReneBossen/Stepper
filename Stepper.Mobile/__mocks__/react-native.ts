import React from 'react';

export const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios || obj.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (styles: any) => styles,
};

export const View = ({ children, ...props }: any) => {
  return React.createElement('View', props, children);
};

export const Text = ({ children, ...props }: any) => {
  return React.createElement('Text', props, children);
};

export const TextInput = ({ children, ...props }: any) => {
  return React.createElement('TextInput', props, children);
};

export const TouchableOpacity = ({ children, onPress, disabled, ...props }: any) => {
  // Use a wrapper function to properly handle disabled state
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };
  return React.createElement('TouchableOpacity', { ...props, onPress: handlePress, disabled }, children);
};

export const ScrollView = ({ children, ...props }: any) => {
  return React.createElement('ScrollView', props, children);
};

export const KeyboardAvoidingView = ({ children, ...props }: any) => {
  return React.createElement('KeyboardAvoidingView', props, children);
};

export const SafeAreaView = ({ children, ...props }: any) => {
  return React.createElement('SafeAreaView', props, children);
};

export const Image = (props: any) => {
  return React.createElement('Image', props);
};

export const Pressable = ({ children, ...props }: any) => {
  return React.createElement('Pressable', props, children);
};

export const ActivityIndicator = (props: any) => {
  return React.createElement('ActivityIndicator', props);
};

export const FlatList = ({ data, renderItem, keyExtractor, ...props }: any) => {
  return React.createElement('FlatList', props,
    data?.map((item: any, index: number) =>
      renderItem({ item, index })
    )
  );
};

export const SectionList = ({ sections, renderItem, renderSectionHeader, keyExtractor, ...props }: any) => {
  return React.createElement('SectionList', props);
};

export const Modal = ({ children, ...props }: any) => {
  return props.visible ? React.createElement('Modal', props, children) : null;
};

export const Alert = {
  alert: jest.fn(),
};

export const Dimensions = {
  get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const useColorScheme = jest.fn().mockReturnValue('light');

export const Animated = {
  Value: jest.fn().mockImplementation((val) => ({
    setValue: jest.fn(),
    interpolate: jest.fn().mockReturnValue(val),
  })),
  View,
  Text,
  Image,
  timing: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback && callback()),
  }),
  spring: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback && callback()),
  }),
  createAnimatedComponent: (Component: any) => Component,
};

export const Linking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

export default {
  Platform,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Image,
  Pressable,
  ActivityIndicator,
  FlatList,
  SectionList,
  Modal,
  Alert,
  Dimensions,
  useColorScheme,
  Animated,
  Linking,
  Keyboard,
};
