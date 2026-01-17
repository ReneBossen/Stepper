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

export default {
  Platform,
  StyleSheet,
  View,
  Text,
};
