/**
 * Utility functions for date handling, focusing on Argentine local time (UTC-3)
 * or local browser time if applicable, and format (DD/MM/YYYY).
 */

/**
 * Returns the local date string in YYYY-MM-DD format.
 * Defaults to current time if no date is provided.
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

/**
 * Formats a YYYY-MM-DD string into the Argentine DD/MM/YYYY format.
 */
export const formatDateAr = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr; // fallback for non-matching strings
};

/**
 * Formats a valid datetime string into DD/MM/YYYY HH:mm
 */
export const formatDateTimeAr = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const pad = (n: number) => {
      const s = n.toString();
      return s.length < 2 ? '0' + s : s;
    };
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch(e) {
    return dateStr;
  }
};
