// Currency formatter
export const formatCurrency = (value: number, decimals = 2): string =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// Percentage formatter
export const formatPct = (value: number, decimals = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;

// Large number formatter (1.2B, 450M, etc.)
export const formatLargeNumber = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
};

// Class name merger (clsx + tailwind-merge)
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
