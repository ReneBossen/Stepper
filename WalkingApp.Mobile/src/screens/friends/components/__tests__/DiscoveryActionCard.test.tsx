import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DiscoveryActionCard } from '../DiscoveryActionCard';

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const RN = require('react-native');

  return {
    Text: ({ children, style, variant, ...props }: any) => (
      <RN.Text {...props} style={style}>{children}</RN.Text>
    ),
    useTheme: () => ({
      colors: {
        primary: '#4CAF50',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        primaryContainer: '#E8F5E9',
        onPrimaryContainer: '#1B5E20',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        outlineVariant: '#E0E0E0',
      },
    }),
  };
});

// Mock MaterialCommunityIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name, size, color, ...props }: any) => {
    const RN = require('react-native');
    return <RN.View testID={`icon-${name}`} {...props} />;
  },
}));

describe('DiscoveryActionCard', () => {
  const defaultProps = {
    icon: 'qrcode-scan' as const,
    title: 'Scan QR Code',
    subtitle: "Scan a friend's code",
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<DiscoveryActionCard {...defaultProps} />);
      expect(getByText('Scan QR Code')).toBeTruthy();
    });

    it('should render the title', () => {
      const { getByText } = render(<DiscoveryActionCard {...defaultProps} />);
      expect(getByText('Scan QR Code')).toBeTruthy();
    });

    it('should render the subtitle', () => {
      const { getByText } = render(<DiscoveryActionCard {...defaultProps} />);
      expect(getByText("Scan a friend's code")).toBeTruthy();
    });

    it('should render the icon', () => {
      const { getByTestId } = render(<DiscoveryActionCard {...defaultProps} />);
      expect(getByTestId('icon-qrcode-scan')).toBeTruthy();
    });

    it('should render the chevron-right icon', () => {
      const { getByTestId } = render(<DiscoveryActionCard {...defaultProps} />);
      expect(getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('should apply testID when provided', () => {
      const { getByTestId } = render(
        <DiscoveryActionCard {...defaultProps} testID="test-action-card" />
      );
      expect(getByTestId('test-action-card')).toBeTruthy();
    });
  });

  describe('different icons', () => {
    it('should render qrcode icon', () => {
      const { getByTestId } = render(
        <DiscoveryActionCard {...defaultProps} icon="qrcode" />
      );
      expect(getByTestId('icon-qrcode')).toBeTruthy();
    });

    it('should render share-variant icon', () => {
      const { getByTestId } = render(
        <DiscoveryActionCard {...defaultProps} icon="share-variant" />
      );
      expect(getByTestId('icon-share-variant')).toBeTruthy();
    });
  });

  describe('onPress handler', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <DiscoveryActionCard {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(getByText('Scan QR Code'));

      expect(onPress).toHaveBeenCalled();
    });

    it('should call onPress only once per press', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <DiscoveryActionCard {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(getByText('Scan QR Code'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label', () => {
      const { getByLabelText } = render(<DiscoveryActionCard {...defaultProps} />);
      expect(getByLabelText("Scan QR Code. Scan a friend's code")).toBeTruthy();
    });

    it('should have button accessibility role', () => {
      const { getByTestId } = render(
        <DiscoveryActionCard {...defaultProps} testID="test-card" />
      );
      const card = getByTestId('test-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('should combine title and subtitle in accessibility label', () => {
      const { getByLabelText } = render(
        <DiscoveryActionCard
          icon="qrcode"
          title="My QR Code"
          subtitle="Show your code"
          onPress={jest.fn()}
        />
      );
      expect(getByLabelText('My QR Code. Show your code')).toBeTruthy();
    });
  });

  describe('different content variations', () => {
    it('should render with My QR Code content', () => {
      const { getByText } = render(
        <DiscoveryActionCard
          icon="qrcode"
          title="My QR Code"
          subtitle="Show your code to friends"
          onPress={jest.fn()}
        />
      );
      expect(getByText('My QR Code')).toBeTruthy();
      expect(getByText('Show your code to friends')).toBeTruthy();
    });

    it('should render with Share Invite content', () => {
      const { getByText } = render(
        <DiscoveryActionCard
          icon="share-variant"
          title="Share Invite Link"
          subtitle="Send a link via message"
          onPress={jest.fn()}
        />
      );
      expect(getByText('Share Invite Link')).toBeTruthy();
      expect(getByText('Send a link via message')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty title', () => {
      const { getByText } = render(
        <DiscoveryActionCard
          {...defaultProps}
          title=""
          subtitle="Subtitle only"
        />
      );
      expect(getByText('Subtitle only')).toBeTruthy();
    });

    it('should handle empty subtitle', () => {
      const { getByText } = render(
        <DiscoveryActionCard
          {...defaultProps}
          title="Title only"
          subtitle=""
        />
      );
      expect(getByText('Title only')).toBeTruthy();
    });

    it('should handle long title text', () => {
      const longTitle = 'This is a very long title that should be truncated';
      const { getByText } = render(
        <DiscoveryActionCard
          {...defaultProps}
          title={longTitle}
        />
      );
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle long subtitle text', () => {
      const longSubtitle = 'This is a very long subtitle that should be truncated to single line';
      const { getByText } = render(
        <DiscoveryActionCard
          {...defaultProps}
          subtitle={longSubtitle}
        />
      );
      expect(getByText(longSubtitle)).toBeTruthy();
    });
  });
});
