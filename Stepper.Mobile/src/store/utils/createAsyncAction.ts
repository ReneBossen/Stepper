import { getErrorMessage } from '@utils/errorUtils';

/**
 * Creates an async action with standardized loading/error handling for Zustand stores.
 *
 * Replaces the common pattern:
 * ```ts
 * someAction: async (...args) => {
 *   set({ isLoading: true, error: null });
 *   try {
 *     const result = await someApiCall(...args);
 *     set({ someData: result, isLoading: false });
 *   } catch (error: unknown) {
 *     set({ error: getErrorMessage(error), isLoading: false });
 *   }
 * }
 * ```
 *
 * @param set - Zustand's set function
 * @param action - The async function to execute
 * @param options - Configuration options
 * @returns A wrapped async function with loading/error state management
 */
export function createAsyncAction<TState, TArgs extends unknown[], TResult>(
  set: (partial: Partial<TState>) => void,
  action: (...args: TArgs) => Promise<TResult>,
  options: {
    /** Key in state for loading flag (default: 'isLoading') */
    loadingKey?: keyof TState;
    /** Key in state for error string (default: 'error') */
    errorKey?: keyof TState;
    /** Called with the result on success - return partial state to merge */
    onSuccess?: (result: TResult) => Partial<TState>;
    /** Whether to rethrow the error after setting error state */
    rethrow?: boolean;
  } = {}
): (...args: TArgs) => Promise<void> {
  const {
    loadingKey = 'isLoading' as keyof TState,
    errorKey = 'error' as keyof TState,
    onSuccess,
    rethrow = false,
  } = options;

  return async (...args: TArgs): Promise<void> => {
    set({
      [loadingKey]: true,
      [errorKey]: null,
    } as Partial<TState>);

    try {
      const result = await action(...args);
      const successState = onSuccess ? onSuccess(result) : {};
      set({
        ...successState,
        [loadingKey]: false,
      } as Partial<TState>);
    } catch (error: unknown) {
      set({
        [errorKey]: getErrorMessage(error),
        [loadingKey]: false,
      } as Partial<TState>);
      if (rethrow) throw error;
    }
  };
}
