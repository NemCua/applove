import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../lib/theme';

export default function NewSos() {
  // TODO(M3): chọn broadcast/direct + target, tạo sos_sessions row.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cầu cứu</Text>
      <Text style={styles.sub}>Chọn nhờ tất cả lốp hoặc 1 người — xây ở mốc M3.</Text>
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
