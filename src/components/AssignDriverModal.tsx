import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import {
  driversService,
  getAssignPickupErrorMessage,
  type SiteDriver,
  type UnclaimedClaim,
} from '@/services/drivers.service';
import { showErrorAlert, showInfoAlert, showSuccessAlert } from '@/utils/apiError';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { useSubmitLock } from '@/hooks/useSubmitLock';

type Props = {
  visible: boolean;
  driver: SiteDriver | null;
  onClose: () => void;
  onAssigned?: () => void;
};

function claimLabel(claim: UnclaimedClaim) {
  const org = claim.listing.organisation?.name || 'Food provider';
  const qty = Number.isFinite(claim.qtyKg) ? `${claim.qtyKg}kg` : '—';
  const address = claim.listing.pickupAddress || 'Address unavailable';
  return `${org} · ${qty} · ${address}`;
}

export function AssignDriverModal({ visible, driver, onClose, onAssigned }: Props) {
  const { submitting, withLock } = useSubmitLock();
  const [claims, setClaims] = useState<UnclaimedClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedClaim = useMemo(
    () => claims.find((claim) => claim.claimId === selectedClaimId) ?? null,
    [claims, selectedClaimId],
  );

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const next = await driversService.getUnclaimedClaims();
      setClaims(next);
      setSelectedClaimId((current) =>
        current && next.some((claim) => claim.claimId === current)
          ? current
          : next[0]?.claimId ?? null,
      );
    } catch (error) {
      showErrorAlert(error, 'Could not load unclaimed pickups', 'Could not load pickups');
      setClaims([]);
      setSelectedClaimId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible || !driver) return;
    setDropdownOpen(false);
    void loadClaims();
  }, [visible, driver, loadClaims]);

  const handleAssign = async () => {
    if (!driver || submitting) return;
    if (!selectedClaim) {
      showInfoAlert('Select an unclaimed pickup to assign.', 'Nothing selected');
      return;
    }

    await withLock(async () => {
      try {
        await driversService.assignPickup({
          claimId: selectedClaim.claimId,
          listingId: selectedClaim.listingId || selectedClaim.listing.id,
          driverId: driver.id,
        });
        showSuccessAlert(
          'Assignment sent — waiting for driver to accept',
          'Driver assigned',
        );
        onAssigned?.();
        onClose();
      } catch (error: unknown) {
        const status = (error as any)?.response?.status;
        const message = getAssignPickupErrorMessage(error);
        if (status === 409) {
          await loadClaims();
        }
        showErrorAlert(message, 'Assignment failed');
      }
    });
  };

  if (!driver) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <AppText variant="h7">Assign pickup</AppText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={normalize(22)} color={palette.text} />
            </Pressable>
          </View>

          <AppText variant="bodySmall" style={styles.driverLine}>
            Driver: <AppText variant="bodyBold">{driver.name || 'Driver'}</AppText>
          </AppText>

          <AppText variant="bodyBold" style={styles.fieldLabel}>
            Unclaimed pickup
          </AppText>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : claims.length === 0 ? (
            <View style={styles.emptyBox}>
              <AppText variant="bodySmall" style={styles.emptyText}>
                No unclaimed pickups right now
              </AppText>
            </View>
          ) : (
            <View style={styles.dropdown}>
              <Pressable
                style={styles.dropdownHeader}
                onPress={() => setDropdownOpen((open) => !open)}
              >
                <AppText
                  variant="bodySmall"
                  style={styles.dropdownValue}
                  numberOfLines={2}
                >
                  {selectedClaim ? claimLabel(selectedClaim) : 'Select a pickup'}
                </AppText>
                <Ionicons
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={normalize(18)}
                  color={palette.kale}
                />
              </Pressable>

              {dropdownOpen ? (
                <View style={styles.optionsWrap}>
                  <FlatList
                    data={claims}
                    keyExtractor={(claim) => String(claim.claimId)}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                    bounces={claims.length > 4}
                    style={styles.optionsList}
                    contentContainerStyle={styles.optionsContent}
                    renderItem={({ item: claim }) => {
                      const selected = claim.claimId === selectedClaimId;
                      return (
                        <Pressable
                          style={[styles.optionRow, selected && styles.optionRowSelected]}
                          onPress={() => {
                            setSelectedClaimId(claim.claimId);
                            setDropdownOpen(false);
                          }}
                        >
                          <AppText
                            variant="bodySmall"
                            style={styles.optionText}
                            numberOfLines={3}
                          >
                            {claimLabel(claim)}
                          </AppText>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.actions}>
            <Button
              label="Cancel"
              size="compact"
              variant="secondary"
              style={styles.actionBtn}
              onPress={onClose}
              disabled={submitting}
            />
            <Button
              label={submitting ? 'Assigning...' : 'Confirm assign'}
              size="compact"
              style={styles.actionBtn}
              onPress={handleAssign}
              disabled={submitting || loading || !selectedClaim}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  sheet: {
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    padding: wp(4.5),
    gap: hp(1.2),
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverLine: {
    color: palette.textMuted,
    textTransform: 'none',
  },
  fieldLabel: {
    marginTop: hp(0.5),
  },
  loadingBox: {
    minHeight: hp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(10),
    padding: wp(3.5),
    backgroundColor: '#F7F7F7',
  },
  emptyText: {
    color: palette.textMuted,
    textTransform: 'none',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(10),
    overflow: 'hidden',
    backgroundColor: palette.white,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    minHeight: normalize(48),
  },
  dropdownValue: {
    flex: 1,
    color: palette.black,
    textTransform: 'none',
  },
  optionsWrap: {
    maxHeight: normalize(220),
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },
  optionsList: {
    flexGrow: 0,
  },
  optionsContent: {
    flexGrow: 0,
  },
  optionRow: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  optionRowSelected: {
    backgroundColor: '#F7FAF7',
  },
  optionText: {
    color: palette.black,
    textTransform: 'none',
  },
  actions: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(0.8),
  },
  actionBtn: {
    flex: 1,
  },
});
