import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../lib/theme';

export default function AddSpare() {
  // TODO(M2): nhập mã mời, gọi RPC redeem_invite_code.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thêm lốp</Text>
      <Text style={styles.sub}>Nhập mã mời — xây ở mốc M2.</Text>
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
