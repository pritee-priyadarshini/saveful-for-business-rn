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

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function ManageAccessScreen() {
  const navigation = useNavigation();

  const [members, setMembers] = useState([
    {
      id: '1',
      name: 'Kim Wilson',
      email: 'kim@saveful.com',
      role: 'owner',
    },
    {
      id: '2',
      name: 'Alex Turner',
      email: 'alex@saveful.com',
      role: 'manager',
    },
  ]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const MAX_USERS = 6;
  const isLimitReached = members.length >= MAX_USERS;

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!editingId && isLimitReached) {
      Alert.alert('Limit reached', 'Upgrade your plan to add more users.');
      return;
    }

    if (editingId) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingId ? { ...m, ...form } : m
        )
      );
      setEditingId(null);
    } else {
      const newUser = {
        id: Date.now().toString(),
        name: form.name,
        email: form.email,
        role: form.role,
      };

      setMembers((prev) => [...prev, newUser]);
    }

    setForm({
      name: '',
      email: '',
      password: '',
      role: '',
    });
  };

  const handleDelete = (id: string, role: string) => {
    if (role === 'owner') {
      Alert.alert('Not allowed', 'Owner cannot be removed');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleEdit = (member: any) => {
    setForm({
      name: member.name,
      email: member.email,
      password: '123456',
      role: member.role,
    });
    setEditingId(member.id);
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
          <AppText variant="label">
            Current Plan
          </AppText>

          <AppText variant="bodySmall">
            $69 / month
          </AppText>

          <AppText variant="bodySmall">
            {members.length} / {MAX_USERS} users added
          </AppText>
        </View>

        {/* FORM CARD */}
        <View style={styles.sectionBox}>
          <AppText variant="label">
            {editingId ? 'Edit Member' : 'Add Team Member'}
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

          <TextInput
            placeholder="Role (e.g. manager)"
            value={form.role}
            onChangeText={(v) => setForm({ ...form, role: v })}
            style={styles.input}
          />

          <Pressable
            onPress={handleSubmit}
            style={[
              styles.addBtn,
              isLimitReached && !editingId && { backgroundColor: '#ccc' },
            ]}
          >
            <AppText variant="label" style={styles.white}>
              {editingId ? 'Update User' : '+ Add User'}
            </AppText>
          </Pressable>
        </View>

        {/* TEAM MEMBERS */}
        <View style={styles.sectionTitleBox}>
          <AppText variant="label">Team Members</AppText>
        </View>

        {members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View>
              <AppText variant="bodyBold">{member.name}</AppText>
              <AppText variant="bodySmall">{member.email}</AppText>
              <AppText variant="bodySmall">
                Role: {member.role}
              </AppText>
            </View>

            <View style={styles.actions}>
              {member.role !== 'owner' && (
                <>
                  <Pressable onPress={() => handleEdit(member)}>
                    <Ionicons name="create-outline" size={20} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(member.id, member.role)}
                  >
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