import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakBadge } from '../StreakBadge';

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Text: ({ children, style, variant, ...props }: any) => {
    const RN = require('react-native');
    return <RN.Text {...props} style={style}>{children}</RN.Text>;
  },
  useTheme: () => ({
    colors: {
      tertiaryContainer: '#FFE0B2',
      onTertiaryContainer: '#E65100',
    },
  }),
}));

describe('StreakBadge', () => {
  it('should render streak count', () => {
    const { getByText } = render(<StreakBadge streak={5} />);

    expect(getByText(/5/)).toBeTruthy();
  });

  it('should show "day" for streak of 1', () => {
    const { getByText } = render(<StreakBadge streak={1} />);

    expect(getByText(/1 day/)).toBeTruthy();
  });

  it('should show "days" for streak greater than 1', () => {
    const { getByText } = render(<StreakBadge streak={7} />);

    expect(getByText(/7 days/)).toBeTruthy();
  });

  it('should show fire emoji', () => {
    const { getByText } = render(<StreakBadge streak={5} />);

    expect(getByText('🔥')).toBeTruthy();
  });

  it('should handle zero streak', () => {
    const { getByText } = render(<StreakBadge streak={0} />);

    expect(getByText(/0 days/)).toBeTruthy();
  });

  it('should handle large streak numbers', () => {
    const { getByText } = render(<StreakBadge streak={365} />);

    expect(getByText(/365 days/)).toBeTruthy();
  });

  it('should show "days" for streak of 2', () => {
    const { getByText } = render(<StreakBadge streak={2} />);

    expect(getByText(/2 days/)).toBeTruthy();
  });
});
