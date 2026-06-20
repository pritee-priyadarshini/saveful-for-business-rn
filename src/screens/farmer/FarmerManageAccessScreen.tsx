import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { CharityMemberRole, charityService } from '@/services/charity.service';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type AccessType = 'user' | 'driver';

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
};

export default function FarmerManageAccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { locationId, orgType } = route.params as {
    locationId: number;
    orgType: 'charity' | 'restaurant' | 'farmer';
  };
  const [activeTab, setActiveTab] = useState<AccessType>('user');

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);

      const res = await charityService.listUsers();

      //onsole.log('USERS API RESPONSE:', res.data);

      const normalizeUsers = (data: any) => [
        ...(data.headOfficeAdmins || []).map((u: any) => ({
          ...u,
          role: 'HEAD_OFFICE_ADMIN',
        })),

        ...(data.headOfficeMembers || []).map((u: any) => ({
          ...u,
          role: 'HEAD_OFFICE',
        })),

        ...(data.locationAdmins || []).map((u: any) => ({
          ...u,
          role: 'LOCATION_ADMIN',
        })),

        ...(data.teamMembers || []).map((u: any) => ({
          ...u,
          role: 'TEAM_MEMBER',
        })),

        ...(data.drivers || []).map((u: any) => ({
          ...u,
          role: 'DRIVER',
        })),
      ];

      setMembers(normalizeUsers(res.data));

    } catch (e) {
      Alert.alert('Error', 'Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    role: '',
  });

  const mapRoleToApi = (role: string): CharityMemberRole => {
    switch (role) {
      case 'site_admin':
        return CharityMemberRole.LOCATION_ADMIN;
      case 'site_team_member':
        return CharityMemberRole.TEAM_MEMBER;
      case 'driver':
        return CharityMemberRole.DRIVER;
      default:
        return CharityMemberRole.TEAM_MEMBER;
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const filteredMembers = members.filter(m => {
    if (activeTab === 'driver') {
      return m.role === 'DRIVER';
    }
    return m.role !== 'DRIVER';
  });

  const mapApiRoleToUI = (role: string) => {
    switch (role) {
      case 'LOCATION_ADMIN':
        return 'site_admin';
      case 'TEAM_MEMBER':
        return 'site_team_member';
      case 'DRIVER':
        return 'driver';
      default:
        return '';
    }
  };
  const handleSubmit = async () => {
    try {
      const finalRole =
        activeTab === 'driver' ? 'driver' : form.role;

      if (!form.firstName || !form.lastName || !form.mobile) {
        Alert.alert('Error', 'Name and mobile are required');
        return;
      }

      if (!editingId) {
        if (!form.email || !form.password || !finalRole) {
          Alert.alert('Error', 'Please fill all fields');
          return;
        }
      }

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile,
        password: form.password,
        role: mapRoleToApi(finalRole),
        locationId: locationId,
      };

      if (editingId) {
        await charityService.updateUser(Number(editingId), {
          firstName: form.firstName,
          lastName: form.lastName,
          mobile: form.mobile,
        });

        Alert.alert('Success', 'User updated');
      } else {
        await charityService.addMember(payload);
        Alert.alert('Success', 'User added');
      }

      fetchMembers();

      setEditingId(null);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        password: '',
        role: '',
      });

    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || 'Something went wrong'
      );
    }
  };

  const handleEdit = (member: any) => {
    setActiveTab(
      member.role === CharityMemberRole.DRIVER ? 'driver' : 'user'
    );

    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      mobile: member.mobile,
      password: '123',
      role: mapApiRoleToUI(member.role),
    });

    setEditingId(member.id.toString());
  };

  const handleDelete = async (id: string) => {
    try {
      await charityService.deleteUser(Number(id));
      fetchMembers();
    } catch {
      Alert.alert('Error', 'Delete failed');
    }
  };

  const prettyRole = (role?: string) => {
    if (!role) return 'Unknown';
    return role.replace(/_/g, ' ');
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <View style={styles.skeletonTabRow}>
        <Skeleton width={wp(40)} height={normalize(40)} borderRadius={normalize(10)} />
        <Skeleton width={wp(40)} height={normalize(40)} borderRadius={normalize(10)} />
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} width={wp(92)} height={normalize(64)} borderRadius={normalize(12)} style={styles.skeletonCard} />
      ))}
    </View>
  );

  if (loadingMembers) {
    return (
      <Screen backgroundColor={palette.creme}>
        {renderSkeleton()}
      </Screen>
    );
  }


  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container} >
        {/* HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/kale-header.png')}
          style={styles.headerBg}
        >
          <Pressable
            style={styles.backIcon}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={normalize(24)}
              color={palette.white}
            />
          </Pressable>

          <View style={styles.headerContent} >
            <AppText variant="h3" style={styles.white} > Manage Access </AppText>

            <View style={{ height: hp(0.7) }} />
            <AppText variant="bodyBold" style={styles.white} > Add and manage users & drivers </AppText>

          </View>

        </ImageBackground>

        {/* TOGGLE PILLS */}
        <View style={styles.tabRow}>
          <Pressable
            style={[
              styles.tabPill,
              activeTab === 'user' &&
              styles.activeTab,
            ]}
            onPress={() => {
              setActiveTab('user');
              setEditingId(null);
              setForm({
                firstName: '',
                lastName: '',
                email: '',
                mobile: '',
                password: '',
                role: '',
              });
            }}
          >
            <AppText
              variant="bodyBold"
              style={[
                styles.tabText,
                activeTab === 'user' &&
                styles.activeTabText,
              ]}
            >
              Add User
            </AppText>
          </Pressable>

          <Pressable
            style={[
              styles.tabPill,
              activeTab ===
              'driver' &&
              styles.activeTab,
            ]}
            onPress={() => {
              setActiveTab('driver');
              setEditingId(null);
              setForm({
                firstName: '',
                lastName: '',
                email: '',
                mobile: '',
                password: '',
                role: '',
              });
            }}
          >
            <AppText
              variant="bodyBold"
              style={[
                styles.tabText,
                activeTab ===
                'driver' &&
                styles.activeTabText,
              ]}
            >
              Add Driver
            </AppText>
          </Pressable>
        </View>

        {/* FORM */}
        <View style={styles.sectionBox}>
          <AppText variant="bodyBold">
            {editingId
              ? `Edit ${activeTab === 'user' ? 'User' : 'Driver'}`
              : `Add ${activeTab === 'user' ? 'User' : 'Driver'}`
            }
          </AppText>

          <TextInput
            placeholder="First Name"
            value={form.firstName}
            onChangeText={v => setForm({ ...form, firstName: v })}
            style={styles.input}
          />

          <TextInput
            placeholder="Last Name"
            value={form.lastName}
            onChangeText={v => setForm({ ...form, lastName: v })}
            style={styles.input}
          />

          <TextInput
            placeholder="Email"
            value={form.email}
            onChangeText={v =>
              setForm({
                ...form,
                email: v,
              })
            }
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Phone Number"
            value={form.mobile}
            onChangeText={v =>
              setForm({
                ...form,
                mobile: v,
              })
            }
            style={styles.input}
            keyboardType="phone-pad"
          />

          {activeTab === 'user' ? (
            <View style={styles.dropdown} >
              <Picker
                selectedValue={form.role}
                onValueChange={v =>
                  setForm({
                    ...form,
                    role: v,
                  })
                }
              >
                <Picker.Item label="Select Role" value="" />
                <Picker.Item label="Site Admin" value="site_admin" />
                <Picker.Item label="Site Team Member" value="site_team_member" />
              </Picker>
            </View>
          ) : (
            <View style={styles.roleLocked} >
              <AppText variant="bodyBold"> Driver </AppText>
            </View>
          )}

          {!editingId && (
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                value={form.password}
                onChangeText={v =>
                  setForm({
                    ...form,
                    password: v,
                  })
                }
                secureTextEntry={!showPassword}
                style={{ flex: 1, }}
              />

              <Pressable
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={normalize(20)}
                  color="#555"
                />
              </Pressable>
            </View>
          )}

          <Pressable
            style={styles.addBtn}
            onPress={handleSubmit}
          >
            <AppText variant="bodyBold" style={styles.white}>
              {editingId
                ? 'Update'
                : `+ Add ${activeTab === 'user' ? 'User' : 'Driver'}`
              }
            </AppText>
          </Pressable>
        </View>

        {/* LIST TITLE */}
        <View style={styles.sectionTitleBox} >
          <AppText variant="bodyBold">
            {activeTab === 'user' ? 'Users' : 'Drivers'}
          </AppText>
        </View>

        {/* LIST */}
        {filteredMembers.map(
          member => (
            <View
              key={member.id}
              style={styles.memberRow}
            >
              <View style={{ flex: 1, }} >
                <AppText variant="bodyBold"> Name: {member.firstName} {member.lastName} </AppText>
                <AppText variant="bodySmall"> Email: {member.email} </AppText>
                <AppText variant="bodySmall"> Phone: {member.mobile} </AppText>
                <AppText variant="bodySmall"> Role: {' '} {prettyRole(member.role)} </AppText>
              </View>

              <View style={styles.actions} >
                {member.role !==
                  'site_admin' && (
                    <>
                      <Pressable
                        onPress={() =>
                          handleEdit(member)
                        }
                      >
                        <Ionicons name="create-outline" size={normalize(22)} />
                      </Pressable>

                      <Pressable
                        onPress={() => handleDelete(member.id.toString())}
                      >
                        <Ionicons name="trash-outline" size={normalize(22)} color={palette.chilli} />
                      </Pressable>
                    </>
                  )}
              </View>
            </View>
          )
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: hp(2),
    paddingBottom: hp(4),
  },

  headerBg: {
    height: hp(20),
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },

  backIcon: {
    position: 'absolute',
    top: hp(2.2),
    left: wp(4),
    zIndex: 5,
  },

  headerContent: {
    alignItems: 'center',
  },

  white: {
    color: palette.white,
    textAlign: 'center',
  },

  tabRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginHorizontal: wp(4),
  },

  tabPill: {
    flex: 1,
    paddingVertical: hp(1.2),
    borderRadius: normalize(999),
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },

  activeTab: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },

  tabText: {
    color: palette.black,
  },

  activeTabText: {
    color: palette.white,
  },

  sectionBox: {
    backgroundColor: palette.white,
    padding: wp(4),
    marginHorizontal: wp(4),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.border,
    gap: hp(1),
  },

  sectionTitleBox: {
    marginHorizontal: wp(4),
  },

  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(8),
    padding: normalize(12),
    backgroundColor: palette.white,
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(8),
    paddingHorizontal: wp(3),
    backgroundColor: palette.white,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(8),
    overflow: 'hidden',
    backgroundColor: palette.white,
  },

  roleLocked: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(8),
    padding: normalize(14),
    backgroundColor: '#F4F4F5',
  },

  addBtn: {
    backgroundColor: palette.primary,
    paddingVertical: hp(1.3),
    borderRadius: normalize(8),
    alignItems: 'center',
  },

  memberRow: {
    backgroundColor: palette.white,
    padding: wp(4),
    marginHorizontal: wp(4),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  skeletonWrap: {
    gap: hp(1.2),
  },
  skeletonTabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(3),
    paddingVertical: hp(1),
  },
  skeletonCard: {
    alignSelf: 'center',
  },
});