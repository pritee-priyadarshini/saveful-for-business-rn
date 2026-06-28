export function formatListingDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatListingTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatListingTimeRange(
  from?: string | null,
  to?: string | null,
): string {
  if (from && to) {
    return `${formatListingTime(from)} – ${formatListingTime(to)}`;
  }
  if (from) return `From ${formatListingTime(from)}`;
  if (to) return `Until ${formatListingTime(to)}`;
  return '—';
}

export function formatListingDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatListingDate(iso)} · ${formatListingTime(iso)}`;
}
