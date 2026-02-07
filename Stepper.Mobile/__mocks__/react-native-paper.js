const React = require('react');

// Create base Dialog component with compound components
function Dialog({ children, ...props }) {
  return React.createElement('Dialog', props, children);
}

Dialog.Title = function({ children, ...props }) {
  return React.createElement('DialogTitle', props, children);
};

Dialog.Content = function({ children, ...props }) {
  return React.createElement('DialogContent', props, children);
};

Dialog.Actions = function({ children, ...props }) {
  return React.createElement('DialogActions', props, children);
};

// Create Appbar component with compound components
const Appbar = {};
Appbar.Header = function({ children, ...props }) {
  return React.createElement('AppbarHeader', props, children);
};
Appbar.Content = function({ children, ...props }) {
  return React.createElement('AppbarContent', props, children);
};
Appbar.Action = function({ children, ...props }) {
  return React.createElement('AppbarAction', props, children);
};
Appbar.BackAction = function({ onPress, ...props }) {
  return React.createElement('AppbarBackAction', { ...props, onPress });
};

// Create Card component with compound components
function Card({ children, ...props }) {
  return React.createElement('Card', props, children);
}
Card.Content = function({ children, ...props }) {
  return React.createElement('CardContent', props, children);
};

// Simple component factories
function Text({ children, ...props }) {
  return React.createElement('Text', props, children);
}

function TextInput({ children, ...props }) {
  return React.createElement('TextInput', props, children);
}

function Button({ children, onPress, ...props }) {
  return React.createElement('Button', { ...props, onPress }, children);
}

function Chip({ children, ...props }) {
  return React.createElement('Chip', props, children);
}

function ActivityIndicator(props) {
  return React.createElement('ActivityIndicator', props);
}

function Searchbar(props) {
  return React.createElement('Searchbar', props);
}

function Portal({ children, ...props }) {
  return React.createElement('Portal', props, children);
}

function Divider(props) {
  return React.createElement('Divider', props);
}

function FAB({ onPress, ...props }) {
  return React.createElement('FAB', { ...props, onPress });
}

function useTheme() {
  return {
    colors: {
      primary: '#6200ee',
      secondary: '#03dac6',
      tertiary: '#018786',
      background: '#ffffff',
      surface: '#ffffff',
      surfaceVariant: '#f5f5f5',
      error: '#b00020',
      onPrimary: '#ffffff',
      onSecondary: '#000000',
      onTertiary: '#ffffff',
      onBackground: '#000000',
      onSurface: '#000000',
      onSurfaceVariant: '#666666',
      outline: '#999999',
    },
    dark: false,
  };
}

module.exports = {
  Dialog,
  Appbar,
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  Searchbar,
  Portal,
  Divider,
  FAB,
  useTheme,
};
