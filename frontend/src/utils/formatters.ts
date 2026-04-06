export const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return 'RWF 0';
  }
  return `RWF ${new Intl.NumberFormat('en-US').format(Math.round(value))}`;
};

export const formatSize = (value: number, unit?: string): string => {
  if (!Number.isFinite(value)) {
    return `0 ${unit || 'sqm'}`;
  }

  return `${new Intl.NumberFormat('en-US').format(value)} ${unit || 'sqm'}`;
};
