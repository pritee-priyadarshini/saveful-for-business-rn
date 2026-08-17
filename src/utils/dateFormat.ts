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

/** Compact D/M (e.g. 12/8) for pickup windows. */
export function formatListingShortDate(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** Date-only pickup range, e.g. "12/8 – 14/8" (same-day: "12/8"). */
export function formatListingPickupDateRange(
  from?: string | null,
  to?: string | null,
): string {
  const fromShort = formatListingShortDate(from);
  const toShort = formatListingShortDate(to);
  if (fromShort && toShort && fromShort !== toShort) {
    return `${fromShort} – ${toShort}`;
  }
  return fromShort || toShort || '—';
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

/**
 * Pickup window pairs each date with its time, e.g.
 * "12/8 · 10:15 am – 14/8 · 10:00 am".
 */
export function formatListingPickupWindow(
  from?: string | null,
  to?: string | null,
): string {
  if (!from && !to) return '—';

  const formatEndpoint = (iso?: string | null) => {
    if (!iso) return '';
    const shortDate = formatListingShortDate(iso);
    if (!shortDate) return '';
    return `${shortDate} · ${formatListingTime(iso)}`;
  };

  const fromLabel = formatEndpoint(from);
  const toLabel = formatEndpoint(to);

  if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
  if (fromLabel) return `From ${fromLabel}`;
  if (toLabel) return `Until ${toLabel}`;
  return '—';
}

export function formatListingDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatListingDate(iso)} · ${formatListingTime(iso)}`;
}
