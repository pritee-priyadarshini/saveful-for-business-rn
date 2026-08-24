import * as SecureStore from 'expo-secure-store';

const REMEMBER_ME_KEY = 'rememberMe';
const REMEMBERED_EMAIL_KEY = 'rememberedEmail';
const REMEMBERED_PASSWORD_KEY = 'rememberedPassword';

export type RememberedCredentials = {
  rememberMe: boolean;
  email: string;
  password: string;
};

export async function loadRememberedCredentials(): Promise<RememberedCredentials> {
  try {
    const [flag, email, password] = await Promise.all([
      SecureStore.getItemAsync(REMEMBER_ME_KEY),
      SecureStore.getItemAsync(REMEMBERED_EMAIL_KEY),
      SecureStore.getItemAsync(REMEMBERED_PASSWORD_KEY),
    ]);
    const rememberMe = flag !== 'false';
    return {
      rememberMe,
      email: rememberMe ? email ?? '' : '',
      password: rememberMe ? password ?? '' : '',
    };
  } catch {
    return { rememberMe: true, email: '', password: '' };
  }
}

export async function saveRememberedCredentials(
  email: string,
  password: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(REMEMBER_ME_KEY, 'true'),
    SecureStore.setItemAsync(REMEMBERED_EMAIL_KEY, email),
    SecureStore.setItemAsync(REMEMBERED_PASSWORD_KEY, password),
  ]);
}

export async function clearRememberedCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(REMEMBER_ME_KEY, 'false'),
    SecureStore.deleteItemAsync(REMEMBERED_EMAIL_KEY),
    SecureStore.deleteItemAsync(REMEMBERED_PASSWORD_KEY),
  ]);
}
