import React from 'react';
import { render } from '@testing-library/react-native';
import { GreetingHeader } from '../GreetingHeader';

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Text: ({ children, style, variant, ...props }: any) => {
    const RN = require('react-native');
    return <RN.Text {...props} style={style}>{children}</RN.Text>;
  },
  useTheme: () => ({
    colors: {
      onBackground: '#000',
    },
  }),
}));

describe('GreetingHeader', () => {
  // Save original Date
  const RealDate = Date;

  afterEach(() => {
    // Restore Date after each test
    global.Date = RealDate;
  });

  const mockDate = (hour: number) => {
    const mockDateInstance = new RealDate(2024, 0, 15, hour, 0, 0);
    global.Date = jest.fn(() => mockDateInstance) as any;
    global.Date.now = RealDate.now;
    (global.Date as any).prototype = RealDate.prototype;
  };

  it('should render display name', () => {
    mockDate(10);
    const { getByText } = render(<GreetingHeader displayName="John Doe" />);

    expect(getByText(/John/)).toBeTruthy();
  });

  it('should show Good Morning between 5 AM and 12 PM', () => {
    mockDate(8);
    const { getByText } = render(<GreetingHeader displayName="John Doe" />);

    expect(getByText(/Good Morning/)).toBeTruthy();
  });

  it('should show Good Afternoon between 12 PM and 5 PM', () => {
    mockDate(14);
    const { getByText } = render(<GreetingHeader displayName="John Doe" />);

    expect(getByText(/Good Afternoon/)).toBeTruthy();
  });

  it('should show Good Evening after 5 PM', () => {
    mockDate(19);
    const { getByText } = render(<GreetingHeader displayName="John Doe" />);

    expect(getByText(/Good Evening/)).toBeTruthy();
  });

  it('should show Good Evening before 5 AM', () => {
    mockDate(3);
    const { getByText } = render(<GreetingHeader displayName="John Doe" />);

    expect(getByText(/Good Evening/)).toBeTruthy();
  });

  it('should use first name only', () => {
    mockDate(10);
    const { getByText, queryByText } = render(
      <GreetingHeader displayName="John Doe Smith" />
    );

    expect(getByText(/John/)).toBeTruthy();
    expect(queryByText(/Doe/)).toBeNull();
  });

  it('should handle single name', () => {
    mockDate(10);
    const { getByText } = render(<GreetingHeader displayName="John" />);

    expect(getByText(/John/)).toBeTruthy();
  });

  it('should show greeting at 5 AM boundary as morning', () => {
    mockDate(5);
    const { getByText } = render(<GreetingHeader displayName="John" />);

    expect(getByText(/Good Morning/)).toBeTruthy();
  });

  it('should show greeting at 12 PM boundary as afternoon', () => {
    mockDate(12);
    const { getByText } = render(<GreetingHeader displayName="John" />);

    expect(getByText(/Good Afternoon/)).toBeTruthy();
  });

  it('should show greeting at 5 PM boundary as evening', () => {
    mockDate(17);
    const { getByText } = render(<GreetingHeader displayName="John" />);

    expect(getByText(/Good Evening/)).toBeTruthy();
  });
});
