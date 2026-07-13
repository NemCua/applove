import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SosButton } from '../../components/SosButton';
import { SpareListItem } from '../../components/SpareListItem';
import { colors } from '../../lib/theme';
import { listMySpares, listOwnersOfMe, removeSpareRelationship, type MySpare, type OwnerOfMe } from '../../lib/api/spares';

function formatRelativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

export default function Home() {
  const [mySpares, setMySpares] = useState<MySpare[]>([]);
  const [ownersOfMe, setOwnersOfMe] = useState<OwnerOfMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [spares, owners] = await Promise.all([listMySpares(), listOwnersOfMe()]);
      setMySpares(spares);
      setOwnersOfMe(owners);
    } catch (err: any) {
      Alert.alert('Lỗi tải dữ liệu', err.message ?? String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const handleRemoveSpare = (relationshipId: string, name: string) => {
    Alert.alert('Xoá lốp', `Xoá ${name} khỏi danh sách lốp của bạn?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSpareRelationship(relationshipId);
            await load();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message ?? String(err));
          }
        },
      },
    ]);
  };

  const handleLeaveOwner = (relationshipId: string, name: string) => {
    Alert.alert('Rời khỏi', `Bạn sẽ không còn là lốp của ${name} nữa?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Rời khỏi',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSpareRelationship(relationshipId);
            await load();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message ?? String(err));
          }
        },
      },
    ]);
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
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Lốp Dự Phòng</Text>
            </View>
            <Link href="/(app)/settings" style={styles.settingsLink}>
              Hồ sơ
            </Link>
          </View>

          <SosButton onPress={() => router.push('/(app)/sos/new')} />

          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Lốp dự phòng của bạn · {mySpares.length}</Text>
            <Pressable onPress={() => router.push('/(app)/add-spare')}>
              <Text style={styles.addLink}>+ Thêm lốp</Text>
            </Pressable>
          </View>

          {mySpares.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lốp nào — bấm "Thêm lốp" để bắt đầu.</Text>
          ) : (
            <View style={styles.list}>
              {mySpares.map((item) => (
                <SpareListItem
                  key={item.relationshipId}
                  personId={item.spare.id}
                  displayName={item.spare.display_name}
                  subtitle={`Đã thêm ${formatRelativeDate(item.createdAt)}`}
                  onRemove={() => handleRemoveSpare(item.relationshipId, item.spare.display_name)}
                />
              ))}
            </View>
          )}

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Bạn là lốp của · {ownersOfMe.length}
          </Text>

          {ownersOfMe.length === 0 ? (
            <Text style={styles.emptyText}>Chưa là lốp của ai.</Text>
          ) : (
            <View style={styles.list}>
              {ownersOfMe.map((item) => (
                <SpareListItem
                  key={item.relationshipId}
                  personId={item.owner.id}
                  displayName={item.owner.display_name}
                  subtitle={`Từ ${formatRelativeDate(item.createdAt)}`}
                  onRemove={() => handleLeaveOwner(item.relationshipId, item.owner.display_name)}
                />
              ))}
            </View>
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, gap: 0 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  settingsLink: { color: colors.calm, fontSize: 13, fontWeight: '600' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  addLink: { color: colors.calm, fontSize: 13, fontWeight: '700' },
  emptyText: { color: colors.textDim, fontSize: 13.5 },
  list: { gap: 10 },
});
