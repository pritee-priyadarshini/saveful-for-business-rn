function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const lowered = trimmed.toLowerCase();
    if (lowered === 'null' || lowered === 'undefined' || lowered === 'nan') {
      return null;
    }
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function readLatLng(source: any): { latitude: unknown; longitude: unknown } {
  if (!source || typeof source !== 'object') {
    return { latitude: undefined, longitude: undefined };
  }

  return {
    latitude: source.latitude ?? source.lat,
    longitude: source.longitude ?? source.lng,
  };
}

/** Normalise profile shape from auth user / API payloads. */
export function normalizeAuthProfile(authUser: any): any {
  if (!authUser) return null;

  const nested = authUser.profile;
  if (nested?.organisation || nested?.organization || nested?.sites || nested?.site) {
    return nested;
  }

  if (authUser.organisation || authUser.organization || authUser.sites || authUser.site) {
    return authUser;
  }

  return nested ?? null;
}

function collectCoordinateCandidates(
  profile: any,
  options?: { preferOrganisation?: boolean },
): Array<{ latitude: unknown; longitude: unknown }> {
  if (!profile) return [];

  const candidates: Array<{ latitude: unknown; longitude: unknown }> = [];
  const sites = Array.isArray(profile.sites)
    ? profile.sites
    : profile.site
      ? [profile.site]
      : [];

  const org = profile.organisation ?? profile.organization;
  const orgCandidates: Array<{ latitude: unknown; longitude: unknown }> = [];
  if (org) {
    orgCandidates.push(readLatLng(org));
    if (org.location && typeof org.location === 'object') {
      orgCandidates.push(readLatLng(org.location));
    }
  }

  const siteCandidates = sites.map((site: any) => readLatLng(site));

  if (options?.preferOrganisation) {
    candidates.push(...orgCandidates, ...siteCandidates);
  } else {
    candidates.push(...siteCandidates, ...orgCandidates);
  }

  return candidates;
}

export function resolveProfileCoordinates(
  profile: any,
  options?: { preferOrganisation?: boolean },
): { lat: number; lng: number } | null {
  for (const candidate of collectCoordinateCandidates(profile, {
    preferOrganisation: options?.preferOrganisation === true,
  })) {
    const lat = parseCoordinate(candidate.latitude);
    const lng = parseCoordinate(candidate.longitude);

    if (lat !== null && lng !== null) {
      return { lat, lng };
    }
  }

  return null;
}

export function profileHasCoordinates(profileOrAuthUser: any): boolean {
  const profile = profileOrAuthUser?.profile
    ? normalizeAuthProfile(profileOrAuthUser)
    : profileOrAuthUser;

  return resolveProfileCoordinates(profile) !== null;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseDistanceKm(distance: unknown): number | null {
  if (distance === null || distance === undefined || distance === '—') return null;

  const match = String(distance).match(/[\d.]+/);
  if (!match) return null;

  const value = parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function getLocationDebugInfo(profile: any) {
  const site = profile?.sites?.[0] ?? profile?.site;
  const org = profile?.organisation ?? profile?.organization;
  const resolved = resolveProfileCoordinates(profile);

  return {
    siteLatitude: site?.latitude ?? site?.lat,
    siteLongitude: site?.longitude ?? site?.lng,
    orgLatitude: org?.latitude ?? org?.lat,
    orgLongitude: org?.longitude ?? org?.lng,
    resolvedLatitude: resolved?.lat ?? null,
    resolvedLongitude: resolved?.lng ?? null,
    hasLocation: resolved !== null,
    sitesCount: Array.isArray(profile?.sites) ? profile.sites.length : profile?.site ? 1 : 0,
  };
}
