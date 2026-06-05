import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Picker } from '@react-native-picker/picker';
import { sitesService } from '@/services/sites.service';

export default function ManageAccessScreen() {
  const navigation = useNavigation();

  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [maxUsers, setMaxUsers] = useState(0);
  const [members, setMembers] = useState<any[]>([]);

  const isLimitReached = maxUsers > 0 && members.length >= maxUsers;

  const handleSubmit = async () => {
    try {
      if (!siteId) {
        Alert.alert('Error', 'No site found');
        return;
      }

      const [firstName, ...rest] = form.name.trim().split(' ');
      const lastName = rest.join(' ');

      const payload = {
        firstName,
        lastName,
        email: form.email,
        password: form.password,
        phoneNumber: form.mobile || undefined,
      };

      if (form.role === 'SITE_ADMIN') {
        await sitesService.assignManager(siteId, payload);
      } else {
        await sitesService.addStaff(siteId, payload);
      }

      Alert.alert('Success', 'User added');

      setForm({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: '',
      });

      fetchTeam();

    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed'
      );
    }
  };

  const handleDelete = (userId: number) => {
    if (!siteId) return;

    Alert.alert(
      'Remove user',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await sitesService.removeAccess(siteId, userId);
              fetchTeam();
            } catch {
              Alert.alert('Error', 'Failed');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);

      const orgRes = await sitesService.getOrganisation();

      const firstSite = orgRes.data?.sites?.[0];

      if (!firstSite) return;

      setSiteId(firstSite.id);
      setMaxUsers(
        orgRes.data?.subscription?.plan?.maxUsersPerSite || 0
      );

      const staffRes = await sitesService.listStaff(firstSite.id);

      const formatted = staffRes.data.map((item: any) => ({
        id: item.user.id,
        firstName: item.user.firstName,
        lastName: item.user.lastName,
        email: item.user.email,
        mobile: item.user.phoneNumber,
        role: item.siteRole,
      }));

      setMembers(formatted);

    } catch (err) {
      Alert.alert('Error', 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/kale-header.png')}
          style={styles.headerBg}
        >
          <Pressable style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <View style={styles.headerContent}>
            <AppText variant="h4" style={styles.white}>
              Manage Access
            </AppText>

            <View style={{ height: 6 }} />

            <AppText variant="bodyBold" style={styles.white}>
              Manage your team and permissions
            </AppText>
          </View>
        </ImageBackground>

        {/* SUBTEXT */}
        <View style={styles.subTextBox}>
          <AppText variant="bodySmall">
            Your restaurant is now live. We’ve notified nearby charities and we’ll let you know as soon as surplus is noted and someone claims it
          </AppText>
        </View>

        {/* CURRENT PLAN CARD */}
        <View style={styles.sectionBox}>
          <AppText variant="bodyBold">
            Current Plan
          </AppText>

          <AppText variant="bodySmall">
            $69 / month
          </AppText>

          <AppText variant="bodySmall">
            {members.length} / {maxUsers} users have been added
          </AppText>
        </View>

        {/* FORM CARD */}
        <View style={styles.sectionBox}>
          <AppText variant="bodyBold">
            Add Team Member
          </AppText>

          <TextInput
            placeholder="Full Name"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
            style={styles.input}
          />

          <TextInput
            placeholder="Email"
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            style={styles.input}
          />

          <TextInput
            placeholder="Phone Number"
            value={form.mobile}
            keyboardType="phone-pad"
            onChangeText={(v) => setForm({ ...form, mobile: v })}
            style={styles.input}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              secureTextEntry={!showPassword}
              style={{ flex: 1 }}
            />

            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#555"
              />
            </Pressable>
          </View>

          <View style={styles.dropdown}>
            <Picker
              selectedValue={form.role}
              onValueChange={(v: string) =>
                setForm({ ...form, role: v })
              }
            >
              <Picker.Item label="Select Role" value="" />
              <Picker.Item label="Site Admin" value="SITE_ADMIN" />
              <Picker.Item label="Staff" value="STAFF" />
            </Picker>
          </View>

          <Pressable
            disabled={loading || isLimitReached}
            onPress={handleSubmit}
            style={[
              styles.addBtn,
              isLimitReached && { backgroundColor: '#ccc' },
            ]}
          >
            <AppText variant="bodyBold" style={styles.white}>
              + Add User
            </AppText>
          </Pressable>
        </View>

        {/* TEAM MEMBERS */}
        <View style={styles.sectionTitleBox}>
          <AppText variant="bodyBold">Team Members</AppText>
        </View>

        {members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View>
              <AppText variant="bodyBold"> {member.firstName} {member.lastName} </AppText>
              <AppText variant="bodySmall">{member.email}</AppText>
              <AppText variant="bodySmall">{member.mobile}</AppText>
              <AppText variant="bodySmall"> Role: {member.role === 'SITE_ADMIN' ? 'Site Admin' : 'Staff'}</AppText>
            </View>

            <View style={styles.actions}>
              {member.role !== 'SITE_ADMIN' && (
                <>
                  <Pressable onPress={() => handleDelete(member.id)} >
                    <Ionicons name="trash-outline" size={20} color="red" />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },

  headerBg: {
    height: 160,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  backIcon: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
  },

  headerContent: {
    alignItems: 'center',
  },

  white: {
    color: palette.white,
    textAlign: 'center',
  },

  subTextBox: {
    marginHorizontal: spacing.md,
  },

  sectionBox: {
    backgroundColor: palette.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.xs,
  },

  sectionTitleBox: {
    marginHorizontal: spacing.md,
  },

  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: palette.white,
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.white,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: palette.white,
  },

  addBtn: {
    backgroundColor: palette.primary,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },

  memberRow: {
    backgroundColor: palette.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});