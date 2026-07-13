import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../lib/theme';

export default function Settings() {
  // TODO(M2+): hồ sơ, đăng xuất, tạo mã mời.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hồ sơ</Text>
      <Text style={styles.sub}>Đăng xuất, tạo mã mời — xây dần từ M2.</Text>
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
