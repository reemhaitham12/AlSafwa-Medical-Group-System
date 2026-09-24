/**
 * Formats a numeric value into EGP Currency representation
 */
export function formatCurrency(amount: number, isArabic = false): string {
  const numericAmount = Number(amount) || 0;
  const formattedNumber = new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  return isArabic ? `${formattedNumber} ج.م` : `${formattedNumber} EGP`;
}

/**
 * Formats ISO date string to localized date
 */
export function formatDate(dateString: string | Date, isArabic = false): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Validates invoice code format
 */
export function formatInvoiceNumber(sequence: number): string {
  return `INV-${String(sequence).padStart(6, '0')}`;
}
