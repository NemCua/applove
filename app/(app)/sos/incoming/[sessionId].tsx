import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../../lib/theme';

export default function IncomingSos() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  // TODO(M3): màn hình spare nhận cầu cứu — đồng ý/từ chối. Đây cũng là deep-link
  // target khi bấm vào push notification (xem M5).
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nhận cầu cứu</Text>
      <Text style={styles.sub}>Phiên {sessionId} — xây ở mốc M3.</Text>
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
