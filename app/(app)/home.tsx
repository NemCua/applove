import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../lib/theme';

export default function Home() {
  // TODO(M2): danh sách lốp + nút Cầu cứu, theo mockup màn 1.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trang chủ</Text>
      <Text style={styles.sub}>Danh sách lốp + nút Cầu cứu — xây ở mốc M2/M3.</Text>
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
