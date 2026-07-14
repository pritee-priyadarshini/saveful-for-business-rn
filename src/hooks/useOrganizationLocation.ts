import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppContext } from '../store/AppContext';
import { useAuthStore } from '../store/authStore';
import { useCharityStore } from '../store/charityStore';
import { organizationService } from '../services/organization.service';
import { sitesService } from '../services/sites.service';
import {
  getLocationDebugInfo,
  normalizeAuthProfile,
  profileHasCoordinates,
} from '../utils/coordinates';
import { fetchCurrentLocation } from '../utils/currentLocation';
import { showErrorAlert } from '../utils/apiError';

function resolvePrimarySiteId(profile: any): number | null {
  const sites = Array.isArray(profile?.sites)
    ? profile.sites
    : profile?.site
      ? [profile.site]
      : [];
  const id = sites[0]?.id ?? sites[0]?.siteId ?? sites[0]?.locationId;
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isCharityLike(authUser: any): boolean {
  const orgType = String(
    authUser?.orgType ?? normalizeAuthProfile(authUser)?.organisation?.organizationType ?? '',
  ).toUpperCase();
  return orgType.startsWith('CHARITY') || orgType === 'FARMER' || orgType === 'FARMER_CONSUMER';
}

export function useOrganizationLocation() {
  const { authUser } = useAppContext();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const updateLocation = useCharityStore((s) => s.updateLocation);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [capturedAddress, setCapturedAddress] = useState('');

  const profile = normalizeAuthProfile(authUser);

  const hasLocation = useMemo(
    () => profileHasCoordinates(profile),
    [profile],
  );

  const showBanner = Boolean(authUser) && !hasLocation && !bannerClosed;

  useEffect(() => {
    const debug = {
      ...getLocationDebugInfo(profile),
      bannerClosed,
      showBanner,
      hasAuthUser: Boolean(authUser),
    };

    console.log('[Location] siteLatitude =', debug.siteLatitude);
    console.log('[Location] siteLongitude =', debug.siteLongitude);
    console.log('[Location] orgLatitude =', debug.orgLatitude);
    console.log('[Location] orgLongitude =', debug.orgLongitude);
    console.log('[Location] resolvedLatitude =', debug.resolvedLatitude);
    console.log('[Location] resolvedLongitude =', debug.resolvedLongitude);
    console.log('[Location] hasLocation =', debug.hasLocation);
    console.log('[Location] bannerClosed =', debug.bannerClosed);
    console.log('[Location] showBanner =', debug.showBanner);
    console.log('[Location] sitesCount =', debug.sitesCount);
  }, [authUser, bannerClosed, profile, showBanner]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLocation) {
        setBannerClosed(false);
        refreshProfile();
      }
    }, [hasLocation, refreshProfile]),
  );

  useEffect(() => {
    if (!authUser?.accessToken || hasLocation) return;
    refreshProfile();
  }, [authUser?.accessToken, hasLocation, refreshProfile]);

  const saveLocation = async (
    latitude: number,
    longitude: number,
    address?: string,
  ) => {
    const organizationId = profile?.organisation?.id ?? profile?.organization?.id;
    if (!organizationId) {
      Alert.alert('Unable to Save', 'Could not find your organisation to update.');
      return false;
    }

    try {
      setSaving(true);

      const siteId = resolvePrimarySiteId(profile);
      if (siteId) {
        if (isCharityLike(authUser)) {
          await updateLocation(siteId, {
            address: address?.trim() || undefined,
            latitude,
            longitude,
          });
        } else {
          await sitesService.updateSite(siteId, {
            address: address?.trim() || undefined,
            latitude,
            longitude,
          });
        }
      }

      await organizationService.updateCoordinates(organizationId, {
        latitude,
        longitude,
      });
      await refreshProfile();

      if (address) setCapturedAddress(address);
      setBannerClosed(true);
      setModalVisible(false);
      return true;
    } catch (error: unknown) {
      showErrorAlert(error, 'Could not save location', 'Failed to save location');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const useGpsLocation = async () => {
    if (gpsLoading || saving) return;

    setGpsLoading(true);
    try {
      const location = await fetchCurrentLocation();
      if (!location) return;

      await saveLocation(location.latitude, location.longitude, location.address);
    } finally {
      setGpsLoading(false);
    }
  };

  return {
    hasLocation,
    showBanner,
    setBannerClosed,
    modalVisible,
    setModalVisible,
    saving,
    gpsLoading,
    useGpsLocation,
    capturedAddress,
    saveLocation,
  };
}
