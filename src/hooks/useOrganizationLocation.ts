import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppContext } from '../store/AppContext';
import { authService } from '../services/auth.service';
import { organizationService } from '../services/organization.service';
import {
  getLocationDebugInfo,
  normalizeAuthProfile,
  profileHasCoordinates,
} from '../utils/coordinates';
import { fetchCurrentLocation } from '../utils/currentLocation';

export function useOrganizationLocation() {
  const { authUser, setAuthUser } = useAppContext();
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

  const refreshProfile = useCallback(async () => {
    if (!authUser?.accessToken) return;

    try {
      const profileRes = await authService.profile();
      const nextProfile = profileRes.data as any;

      setAuthUser({
        ...nextProfile.user,
        accessToken: authUser.accessToken,
        orgType: nextProfile.organisation?.type,
        orgRole: nextProfile.role?.orgRole,
        siteRole: nextProfile.role?.siteRole,
        profile: nextProfile,
      });
    } catch {
      // keep existing profile data
    }
  }, [authUser?.accessToken, setAuthUser]);

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
      await organizationService.updateCoordinates(organizationId, {
        latitude,
        longitude,
      });

      await refreshProfile();

      if (address) setCapturedAddress(address);
      setBannerClosed(true);
      setModalVisible(false);
      return true;
    } catch (error: any) {
      const errMsg = error?.response?.data?.message;
      Alert.alert(
        'Error',
        Array.isArray(errMsg) ? errMsg.join('\n') : errMsg || 'Failed to save location.',
      );
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
