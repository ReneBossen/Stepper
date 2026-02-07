import type { NavigationProp } from '@react-navigation/native';

/**
 * Navigate to a root-level screen (e.g., Notifications).
 * Traverses one level up from the current stack navigator to the MainStack.
 *
 * Navigation hierarchy: HomeStack -> TabNavigator -> MainStack
 * This goes up one level (HomeStack -> TabNavigator parent = MainStack).
 */
export function navigateToRootScreen(
  navigation: NavigationProp<Record<string, unknown>>,
  screen: string,
  params?: Record<string, unknown>
): void {
  navigation.getParent()?.navigate(screen as never, params as never);
}

/**
 * Navigate to a specific tab in the bottom tab navigator.
 * Traverses two levels up from a stack screen within a tab to the MainStack,
 * then navigates into the Tabs navigator targeting a specific tab.
 *
 * Navigation hierarchy: HomeStack -> TabNavigator -> MainStack
 * This goes up two levels (HomeStack -> TabNavigator -> MainStack)
 * then navigates to Tabs -> target tab.
 */
export function navigateToTab(
  navigation: NavigationProp<Record<string, unknown>>,
  tabScreen: string,
  params?: Record<string, unknown>
): void {
  navigation
    .getParent()
    ?.getParent()
    ?.navigate(
      'Tabs' as never,
      {
        screen: tabScreen,
        ...(params && { params }),
      } as never
    );
}
