export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('da-DK', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('da-DK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
