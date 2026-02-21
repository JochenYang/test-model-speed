import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function for merging tailwind classes
 * shadcn/ui standard implementation
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
