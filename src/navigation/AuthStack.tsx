import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthScreen } from '../screens/auth/AuthScreen';
import { RoleSelectionMainScreen } from '../screens/auth/RoleSelectionMainScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { AuthStackParamList } from './types';
import { EmailVerificationScreen } from '@/screens/auth/EmailVerificationScreen';
import { TeamInviteScreen } from '@/screens/auth/TeamInviteScreen';
import { SignInScreen } from '@/screens/auth/SignInScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={WelcomeScreen} name="Welcome" />
      <Stack.Screen component={RoleSelectionMainScreen} name="RoleSelection" />
      <Stack.Screen component={AuthScreen} name="Auth" />
      <Stack.Screen component={EmailVerificationScreen} name="EmailVerification" />
      <Stack.Screen component={TeamInviteScreen} name="TeamInvite" />
      <Stack.Screen component={SignInScreen} name="SignIn" />
    </Stack.Navigator>
  );
}
