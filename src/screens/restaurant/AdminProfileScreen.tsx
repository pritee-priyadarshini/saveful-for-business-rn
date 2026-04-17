import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { palette } from '@/theme/colors';

export default function AdminProfileScreen() {
  const navigation = useNavigation();

  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    adminName: 'John Doe',
    email: 'john@demo.com',
    mobile: '+91 9876543210',
    password: '',
  });

  const handleSave = () => {
    setIsEditing(false);
    console.log('Saved:', form);
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* TOP HEADER BG */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerImage}
          />

          <View style={styles.headerContent}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color={palette.white} />
            </Pressable>

            <AppText variant='h5' style={styles.headerTitle}>
              ADMIN PROFILE
            </AppText>
          </View>

        </View>

        {/* BUSINESS CARD */}
        <View style={styles.profileCard}>
          <Image
            source={require('../../../assets/intro/burger_king_logo.png')}
            style={styles.logo}
          />

          <AppText variant='h7'>
            Burger King India
          </AppText>

          <AppText variant='bodySmall'>
            ID: IND1234abc
          </AppText>
        </View>

        {/* FORM */}
        <View style={styles.form}>

          <View style={styles.formHeader}>
            <AppText variant='bodyLarge'>
              Super Admin Details
            </AppText>

            <Pressable onPress={() => setIsEditing(!isEditing)}>
              <Ionicons name="pencil" size={18} />
            </Pressable>
          </View>

          {[
            { key: 'adminName', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'mobile', label: 'Contact' },
            { key: 'password', label: 'Password' },
          ].map((field: any) => {
            const isPassword = field.key === 'password';

            return (
              <View key={field.key} style={styles.inputBlock}>
                <AppText variant="label" style={styles.label}>
                  {field.label}
                </AppText>

                <View style={styles.inputWrapper}>
                  <TextInput
                    value={(form as any)[field.key]}
                    secureTextEntry={isPassword && !showPassword}
                    editable={isEditing}
                    onChangeText={(v) =>
                      setForm({ ...form, [field.key]: v })
                    }
                    style={[
                      styles.input,
                      isPassword && { paddingRight: 40 },
                      !isEditing && styles.disabledInput,
                    ]}
                  />

                  {isPassword && (
                    <Pressable
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color="#777"
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}

        </View>

        {isEditing && (
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <AppText variant='label' style={{ color: palette.white }}>
              Save Changes
            </AppText>
          </Pressable>
        )}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },

  headerBg: {
    height: 160,
    position: 'relative',
  },

  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  headerContent: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  headerTitle: {
    color: palette.white,
  },

  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
  },

  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -50,
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
  },

  logo: {
    width: 120,
    height: 90,
    resizeMode: 'cover',
    marginBottom: 10,
  },

  form: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },

  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  inputBlock: {
    marginBottom: 12,
  },

  label: {
    marginBottom: 4,
    color: '#555',
  },

  input: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },

  disabledInput: {
    opacity: 0.6,
  },

  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },

  eyeIcon: {
    position: 'absolute',
    right: 12,
  },

  saveBtn: {
    backgroundColor: palette.middlegreen,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

});