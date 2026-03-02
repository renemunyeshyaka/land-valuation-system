export const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '₨0';
  }

  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatSize = (value: number, unit?: string): string => {
  if (!Number.isFinite(value)) {
    return `0 ${unit || 'sqm'}`;
  }

  return `${new Intl.NumberFormat('en-US').format(value)} ${unit || 'sqm'}`;
};
