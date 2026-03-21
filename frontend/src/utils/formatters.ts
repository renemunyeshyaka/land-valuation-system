export const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return 'EUR 0';
  }
  return `EUR ${value}`;
};

export const formatSize = (value: number, unit?: string): string => {
  if (!Number.isFinite(value)) {
    return `0 ${unit || 'sqm'}`;
  }

  return `${new Intl.NumberFormat('en-US').format(value)} ${unit || 'sqm'}`;
};
