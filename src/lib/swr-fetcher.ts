// src/lib/swr-fetcher.ts
import { api } from './api';

export const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};