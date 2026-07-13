import { Stack } from 'expo-router';

export default function AppLayout() {
  // TODO(M1): guard — nếu chưa có session, redirect về (auth)/login.
  return <Stack screenOptions={{ headerShown: false }} />;
}
