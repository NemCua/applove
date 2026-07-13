import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function Settings() {
  const { session, signOut } = useAuth();
  // TODO(M2+): tạo mã mời hiển thị ở đây thay vì chỉ đăng xuất.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hồ sơ</Text>
      <Text style={styles.sub}>{session?.user.email}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Đăng xuất</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.textDim, textAlign: 'center' },
  button: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  buttonText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
