import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { IconBubble, cc } from '@/components/consolidated/ui';
import { normalize } from '@/utils/responsive';
import { consolidatedService } from '@/services/consolidated.service';
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import type { PermissionUser } from '@/types/consolidated';

function eligible(user: PermissionUser) {
  if (user.eligible === true) return true;
  if (user.eligible === false) return false;
  const org = String(user.orgRole || '').toUpperCase();
  const site = String(user.siteRole || user.role || '').toUpperCase();
  if (org === 'ORG_ADMIN' || site === 'SITE_ADMIN') return true;
  return user.canManage;
}

function isOwner(user: PermissionUser) {
  return String(user.orgRole || '').toUpperCase() === 'SUPER_ADMIN';
}

export function ConsolidatedPermissionSection() {
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await consolidatedService.getPermissions();
      setUsers(rows);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 403) {
        setUsers([]);
        return;
      }
      showErrorAlert(error, 'Could not load collection permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const toggle = async (user: PermissionUser, next: boolean) => {
    const previous = user.canManage;
    setUsers((rows) => rows.map((row) => (row.id === user.id ? { ...row, canManage: next } : row)));
    setPendingId(user.id);
    try {
      await consolidatedService.setPermission(user.id, next);
    } catch (error) {
      setUsers((rows) => rows.map((row) => (row.id === user.id ? { ...row, canManage: previous } : row)));
      showErrorAlert(error, 'Could not update permission');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <IconBubble name="git-merge-outline" size={38} />
        <View style={styles.copy}>
          <AppText variant="bodyBold">Consolidated Collections managers</AppText>
          <AppText variant="meta" color={palette.stone}>
            Managers set up collection groups, schedule collections and publish them to charities.
          </AppText>
        </View>
      </View>
      {loading ? <ActivityIndicator color={palette.kale} /> : null}
      {!loading && users.length === 0 ? (
        <AppText variant="bodySmall" color={palette.stone}>No users to show yet.</AppText>
      ) : null}
      {users.map((user, index) => {
        const owner = isOwner(user);
        const enabled = !owner && eligible(user);
        const on = owner ? true : user.canManage;
        return (
          <View key={user.id} style={[styles.row, index === 0 && styles.firstRow]}>
            <View style={[styles.avatar, on && styles.avatarOn]}>
              <AppText variant="meta" color={on ? palette.white : palette.kale} style={styles.initials}>
                {user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '·'}
              </AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyBold" numberOfLines={1}>{user.name}</AppText>
              {owner ? (
                <AppText variant="meta" color={palette.kale}>Owner · always a manager</AppText>
              ) : !enabled ? (
                <AppText variant="meta" color={palette.stone}>Needs Org Admin or Site Admin role</AppText>
              ) : user.email ? (
                <AppText variant="meta" color={palette.stone} numberOfLines={1}>{user.email}</AppText>
              ) : null}
            </View>
            <Switch
              value={on}
              disabled={!enabled || pendingId === user.id}
              onValueChange={(value) => { void toggle(user, value); }}
              trackColor={{ true: palette.kale, false: '#D9D9D9' }}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
    gap: 4,
    backgroundColor: palette.white,
    borderRadius: cc.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cc.hairline,
    padding: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cc.hairline,
  },
  firstRow: { marginTop: 4 },
  avatar: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    backgroundColor: cc.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: { backgroundColor: palette.kale },
  initials: { fontWeight: '700' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
