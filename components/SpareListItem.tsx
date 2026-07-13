import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

const AVATAR_COLORS = ['#4C8DFF', '#E85A9C', '#8A5FE8', '#3DD68C', '#FF6B35'];

function avatarColorFor(id: string) {
  const sum = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

type Props = {
  displayName: string;
  subtitle: string;
  personId: string;
  onRemove?: () => void;
};

export function SpareListItem({ displayName, subtitle, personId, onRemove }: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarColorFor(personId) }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Text style={styles.removeText}>Xoá</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12.5, color: colors.textDim, marginTop: 1 },
  removeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  removeText: { color: colors.danger, fontSize: 12.5, fontWeight: '600' },
});
