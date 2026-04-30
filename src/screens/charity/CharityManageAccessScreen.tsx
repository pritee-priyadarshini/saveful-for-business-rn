import React, { useState } from 'react';
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
import { Picker } from '@react-native-picker/picker';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type AccessType = 'user' | 'driver';

type Member = {
  id: string;
  type: AccessType;
  name: string;
  email: string;
  mobile: string;
  role: string;
  password: string;
};

export default function CharityManageAccessScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<AccessType>('user');

  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      type: 'user',
      name: 'Sarah Wilson',
      email: 'sarah@charity.org',
      mobile: '+91 9876543210',
      role: 'site_admin',
      password: '123456',
    },
    {
      id: '2',
      type: 'user',
      name: 'John Mathew',
      email: 'john@charity.org',
      mobile: '+91 9123456780',
      role: 'site_team_member',
      password: '123456',
    },
    {
      id: '3',
      type: 'driver',
      name: 'Rahul Das',
      email: 'rahul@charity.org',
      mobile: '+91 9876512345',
      role: 'driver',
      password: '123456',
    },
    {
      id: '4',
      type: 'driver',
      name: 'Sanjay Rout',
      email: 'sanjay@charity.org',
      mobile: '+91 9876523456',
      role: 'driver',
      password: '123456',
    },
  ]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const filteredMembers = members.filter(m => m.type === activeTab);

  const handleSubmit = () => {
    const finalRole =
      activeTab === 'driver' ? 'driver' : form.role;
    if (
      !form.name ||
      !form.email ||
      !form.mobile ||
      !form.password ||
      !finalRole
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (editingId) {
      setMembers(prev =>
        prev.map(member =>
          member.id === editingId
            ? {
              ...member,
              ...form,
              role: finalRole,
              type: activeTab,
            }
            : member
        )
      );

      setEditingId(null);
    } else {
      const newMember: Member = {
        id: Date.now().toString(),
        type: activeTab,
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        role: finalRole,
      };

      setMembers(prev => [
        ...prev,
        newMember,
      ]);
    }

    setForm({
      name: '',
      email: '',
      mobile: '',
      password: '',
      role: '',
    });
  };

  const handleEdit = (member: Member) => {
    setActiveTab(member.type);
    setForm({
      name: member.name,
      email: member.email,
      mobile: member.mobile,
      password: member.password,
      role: member.role,
    });
    setEditingId(member.id);
  };

  const handleDelete = (id: string, role: string) => {
    if (role === 'site_admin') {
      Alert.alert('Not allowed', 'Site admin cannot be removed');
      return;
    }

    setMembers(prev => prev.filter(m => m.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: '',
      });
    }
  };

  const prettyRole = (role: string) => {
    return role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

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
              size={24}
              color={palette.white}
            />
          </Pressable>

          <View style={styles.headerContent} >
            <AppText variant="h3" style={styles.white} > Manage Access </AppText>

            <View style={{ height: 6 }} />
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
                name: '',
                email: '',
                mobile: '',
                password: '',
                role: '',
              });
            }}
          >
            <AppText
              variant="label"
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
                name: '',
                email: '',
                mobile: '',
                password: '',
                role: '',
              });
            }}
          >
            <AppText
              variant="label"
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
          <AppText variant="label">
            {editingId
              ? `Edit ${activeTab === 'user' ? 'User' : 'Driver'}`
              : `Add ${activeTab === 'user' ? 'User' : 'Driver'}`
            }
          </AppText>

          <TextInput
            placeholder="Full Name"
            value={form.name}
            onChangeText={v =>
              setForm({
                ...form,
                name: v,
              })
            }
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
              <AppText variant="label"> Driver </AppText>
            </View>
          )}

          <View style={styles.passwordContainer} >
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
                size={20}
                color="#555"
              />
            </Pressable>
          </View>

          <Pressable
            style={styles.addBtn}
            onPress={handleSubmit}
          >
            <AppText variant="label" style={styles.white}>
              {editingId
                ? 'Update'
                : `+ Add ${activeTab === 'user' ? 'User' : 'Driver'}`
              }
            </AppText>
          </Pressable>
        </View>

        {/* LIST TITLE */}
        <View style={styles.sectionTitleBox} >
          <AppText variant="label">
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
                <AppText variant="bodyBold"> {member.name} </AppText>
                <AppText variant="bodySmall"> {member.email} </AppText>
                <AppText variant="bodySmall"> {member.mobile} </AppText>
                <AppText variant="bodySmall"> Role:{' '} {prettyRole(member.role)} </AppText>
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
                        <Ionicons name="create-outline" size={22} />
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          handleDelete(
                            member.id,
                            member.role
                          )
                        }
                      >
                        <Ionicons name="trash-outline" size={22} color={palette.chilli} />
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
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },

  tabPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 999,
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
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
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

  roleLocked: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor:'#F4F4F5',
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
    flexDirection:  'row',
    gap: spacing.sm,
  },
});