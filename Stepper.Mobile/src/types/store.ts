export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginatedState<T> {
  items: T[];
  hasMore: boolean;
  page: number;
}

export type AsyncAction<T extends any[], R> = (
  ...args: T
) => Promise<R>;
