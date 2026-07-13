import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export function SosButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Khẩn cấp</Text>
      <Text style={styles.title}>Xe hỏng, hết xăng, bể bánh?</Text>
      <Pressable style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>🆘 Cầu cứu ngay</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    padding: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#fff', marginBottom: 14, lineHeight: 24 },
  button: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: { color: '#C4441C', fontWeight: '800', fontSize: 15 },
});
