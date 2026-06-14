/**
 * Utility functions for date formatting and timezone handling
 */

/**
 * Format a date to local time with Mountain Time fallback
 * @param date - The date to format (string or Date object)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatLocalDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return 'N/A'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid Date'

  // Display the TRUE recorded timestamp. (A prior hack rewrote 2025 dates to 2024 for display;
  // that silently falsified evidence timestamps and has been removed. Any genuine date offset
  // must be corrected in the source data, never in a display formatter.)

  // Default options for consistent formatting
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options
  }
  
  try {
    // Try to use browser's locale and timezone
    return dateObj.toLocaleString(undefined, defaultOptions)
  } catch (error) {
    // Fallback to Mountain Time if browser timezone detection fails
    try {
      return dateObj.toLocaleString('en-US', {
        ...defaultOptions,
        timeZone: 'America/Phoenix' // Arizona doesn't observe DST
      })
    } catch (fallbackError) {
      // Last resort: basic ISO string
      return dateObj.toISOString()
    }
  }
}

/**
 * Format time only (no date)
 */
export function formatLocalTime(
  date: string | Date | null | undefined,
  includeSeconds: boolean = true
): string {
  if (!date) return 'N/A'
  
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
    year: undefined, // Don't show year in time-only format
    month: undefined,
    day: undefined
  }
  
  return formatLocalDate(date, options)
}

/**
 * Format date only (no time)
 */
export function formatLocalDateOnly(
  date: string | Date | null | undefined
): string {
  if (!date) return 'N/A'
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return formatLocalDate(date, options)
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(
  date: string | Date | null | undefined
): string {
  if (!date) return 'N/A'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) return 'Invalid Date'

  // True timestamps only — the 2025→2024 rewrite (here and for "now") has been removed.
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffSec < 60) return `${diffSec} seconds ago`
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  
  return formatLocalDate(date)
}

/**
 * Get timezone display name
 */
export function getTimezoneDisplay(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return timezone || 'Mountain Time'
  } catch {
    return 'Mountain Time'
  }
}

/**
 * Format duration in minutes/hours
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`
  }
  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`
}