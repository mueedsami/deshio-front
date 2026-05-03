import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * If true, the store-scoping interceptor will NOT inject store_id.
     * Useful for cross-store lookups or global administrative tasks.
     */
    skipStoreScope?: boolean;
  }
}
