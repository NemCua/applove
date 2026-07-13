import { Redirect } from 'expo-router';

export default function Index() {
  // TODO(M1): kiểm tra session Supabase thật, redirect theo trạng thái đăng nhập.
  return <Redirect href="/(auth)/login" />;
}
