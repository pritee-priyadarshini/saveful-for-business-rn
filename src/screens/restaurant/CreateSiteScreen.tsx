import React, { useState } from 'react';
import {
    View,
    ScrollView,
    TextInput,
    Pressable,
    StyleSheet,
    Alert,
    ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function CreateSiteScreen() {
    const navigation = useNavigation();
    const [showPassword, setShowPassword] = useState(false);

    const [form, setForm] = useState({
        restaurantName: '',
        location: '',
        postcode: '',
        adminName: '',
        email: '',
        mobile: '',
        password: '',
    });

    const handleCreate = () => {
        const {
            restaurantName,
            location,
            postcode,
            adminName,
            email,
            mobile,
            password,
        } = form;

        if (
            !restaurantName ||
            !location ||
            !postcode ||
            !adminName ||
            !email ||
            !mobile ||
            !password
        ) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        const newSite = {
            id: Date.now().toString(),
            ...form,
        };

        console.log('Created Site:', newSite);

        Alert.alert('Success', 'Site Created Successfully');

        navigation.goBack();
    };

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView >

                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.headerBg}
                >
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                    >
                        <Ionicons name="arrow-back" size={24} color={palette.white} />
                    </Pressable>

                    <AppText variant='h5' style={styles.headerTitle}>
                        Add Sites
                    </AppText>
                </ImageBackground>


                {[
                    { key: 'restaurantName', label: 'Restaurant Name' },
                    { key: 'location', label: 'Location / Address' },
                    { key: 'postcode', label: 'Postcode' },
                    { key: 'adminName', label: 'Site Admin Name' },
                    { key: 'email', label: 'Site Admin Email ID' },
                    { key: 'mobile', label: 'Site Admin Mobile Number' },
                    { key: 'password', label: 'Site Admin Password', secure: true },
                ].map((field: any) => (
                    <View key={field.key} style={styles.fieldWrapper}>

                        <AppText variant='label' style={styles.label}>
                            {field.label}
                        </AppText>

                        <View style={styles.inputWrapper}>
                            <TextInput
                                placeholder={`Enter ${field.label}`}
                                secureTextEntry={field.key === 'password' ? !showPassword : field.secure}
                                value={(form as any)[field.key]}
                                onChangeText={(v) =>
                                    setForm({ ...form, [field.key]: v })
                                }
                                style={styles.inputFlex}
                            />

                            {field.key === 'password' && (
                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color="#777"
                                    />
                                </Pressable>
                            )}
                        </View>

                    </View>
                ))}



                <Pressable style={styles.createBtn} onPress={handleCreate}>
                    <AppText variant='label' style={styles.btnText}>
                        Add Site
                    </AppText>
                </Pressable>

            </ScrollView>
        </Screen >
    );
}

const styles = StyleSheet.create({
    headerBg: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },

    backBtn: {
        position: 'absolute',
        left: 15,
        top: 20,
    },

    headerTitle: {
        color: palette.white,
    },

    fieldWrapper: {
        marginVertical: spacing.sm,
        marginHorizontal: spacing.lg,
    },

    label: {
        marginBottom: spacing.sm,
        color: '#555',
    },

    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: spacing.sm,
    },

    inputFlex: {
        flex: 1,
    },

    createBtn: {
        backgroundColor: palette.middlegreen,
        padding: 14,
        marginHorizontal: spacing.xxl,
        borderRadius: 10,
        alignItems: 'center',
        margin: spacing.md,
    },

    btnText: {
        color: 'white',
    },
});