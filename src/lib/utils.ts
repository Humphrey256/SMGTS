import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format numbers as Ugandan Shillings (UGX)
export function formatUGX(amount: number) {
  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if Intl fails
    return `UGX ${Math.round(amount).toLocaleString()}`;
  }
}

// Short-format for UI where the prefix uses 'USh' (e.g. 'USh 3,500')
export function formatUSh(amount: number) {
  try {
    const formatted = new Intl.NumberFormat('en-UG', {
      maximumFractionDigits: 0,
    }).format(amount);
    return `USh ${formatted}`;
  } catch {
    return `USh ${Math.round(amount).toLocaleString()}`;
  }
}
