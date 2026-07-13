import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../lib/theme';
import { listMySpares, type MySpare } from '../../../lib/api/spares';
import { createSosSession } from '../../../lib/api/sos';

export default function NewSos() {
  const [spares, setSpares] = useState<MySpare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      listMySpares()
        .then(setSpares)
        .catch((err: any) => Alert.alert('Lỗi tải danh sách lốp', err.message ?? String(err)))
        .finally(() => setIsLoading(false));
    }, [])
  );

  const start = async (mode: 'broadcast' | 'direct', targetSpareId?: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const sessionId = await createSosSession(mode, targetSpareId);
      router.replace({ pathname: '/(app)/sos/[sessionId]', params: { sessionId } });
    } catch (err: any) {
      Alert.alert('Không tạo được phiên cầu cứu', err.message ?? String(err));
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={spares}
      keyExtractor={(item) => item.relationshipId}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Cầu cứu</Text>
          <Text style={styles.sub}>Chọn nhờ tất cả lốp, hoặc nhờ riêng 1 người bên dưới.</Text>

          <Pressable
            style={[styles.broadcastButton, (isCreating || spares.length === 0) && styles.disabled]}
            disabled={isCreating || spares.length === 0}
            onPress={() => start('broadcast')}
          >
            <Text style={styles.broadcastText}>🆘 Nhờ tất cả lốp ({spares.length})</Text>
          </Pressable>

          {spares.length === 0 && (
            <Text style={styles.emptyText}>Bạn chưa có lốp nào — thêm lốp trước khi cầu cứu.</Text>
          )}

          {spares.length > 0 && <Text style={styles.sectionLabel}>Hoặc nhờ riêng 1 người</Text>}
        </>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.spareRow, isCreating && styles.disabled]}
          disabled={isCreating}
          onPress={() => start('direct', item.spare.id)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.spare.display_name.trim().charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.spareName}>{item.spare.display_name}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, gap: 10 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sub: { fontSize: 14, color: colors.textDim, marginBottom: 18 },
  broadcastButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 22,
  },
  broadcastText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: 10,
  },
  emptyText: { color: colors.textDim, fontSize: 13.5, marginBottom: 12 },
  spareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.calm,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  spareName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
});
