/** Shape of every successful backend response. */
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

/** Shape of every failed backend response. */
export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
