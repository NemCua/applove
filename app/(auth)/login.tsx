import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../lib/theme';

export default function Login() {
  // TODO(M1): form đăng nhập thật, gọi supabase.auth.signInWithPassword.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>
      <Text style={styles.sub}>Màn hình sẽ được xây ở mốc M1.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.textDim, textAlign: 'center' },
});
