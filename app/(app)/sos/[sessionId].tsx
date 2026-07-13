import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../lib/theme';

export default function ActiveSos() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  // TODO(M3/M4): màn hình owner đang cầu cứu — bản đồ + vị trí realtime + sheet trạng thái.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đang cầu cứu</Text>
      <Text style={styles.sub}>Phiên {sessionId} — xây ở mốc M3/M4.</Text>
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
