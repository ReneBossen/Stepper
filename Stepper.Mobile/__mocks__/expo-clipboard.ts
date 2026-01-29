/**
 * Mock for expo-clipboard used in tests
 */
export const setStringAsync = jest.fn(() => Promise.resolve());
export const getStringAsync = jest.fn(() => Promise.resolve(''));
export const hasStringAsync = jest.fn(() => Promise.resolve(false));
export const setString = jest.fn();
export const getString = jest.fn(() => '');
export const hasString = jest.fn(() => false);
