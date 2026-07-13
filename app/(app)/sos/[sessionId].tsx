import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../lib/theme';
import { supabase } from '../../../lib/supabase';
import {
  endSosSession,
  getSosSession,
  listSosResponses,
  updateSosLocation,
  type SosResponse,
  type SosSession,
} from '../../../lib/api/sos';

const STATUS_LABEL: Record<SosSession['status'], string> = {
  active: 'Đang chờ phản hồi...',
  accepted: 'Đã có người nhận giúp!',
  ended: 'Phiên đã kết thúc',
};

const RESPONSE_LABEL: Record<SosResponse['status'], string> = {
  pending: 'Chưa trả lời',
  accepted: 'Đồng ý giúp',
  declined: 'Đã từ chối',
};

export default function ActiveSos() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<SosSession | null>(null);
  const [responses, setResponses] = useState<SosResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const [s, r] = await Promise.all([getSosSession(sessionId), listSosResponses(sessionId)]);
    setSession(s);
    setResponses(r);
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load()
        .catch((err: any) => Alert.alert('Lỗi tải phiên cầu cứu', err.message ?? String(err)))
        .finally(() => setIsLoading(false));
    }, [load])
  );

  useEffect(() => {
    if (!sessionId) return;
    const topic = `realtime:sos-owner-${sessionId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`sos-owner-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_sessions', filter: `id=eq.${sessionId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_responses', filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, load]);

  // Chỉ chia sẻ vị trí khi đã có người đồng ý giúp (CONTEXT.md §4.3) — chưa ai
  // nhận thì chưa cần bật GPS, đỡ hao pin. Tự dừng khi phiên kết thúc hoặc màn
  // hình unmount.
  useEffect(() => {
    if (!sessionId || !session || session.status !== 'accepted') {
      watchSubscription.current?.remove();
      watchSubscription.current = null;
      return;
    }

    if (watchSubscription.current) return;

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setLocationError('Cần cho phép truy cập vị trí để chia sẻ với người đang giúp bạn.');
        return;
      }

      setLocationError(null);
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
        (loc) => {
          updateSosLocation(sessionId, loc.coords.latitude, loc.coords.longitude).catch((err: any) => {
            setLocationError(err.message ?? String(err));
          });
        }
      );
      if (cancelled) {
        sub.remove();
        return;
      }
      watchSubscription.current = sub;
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, session?.status]);

  useEffect(() => {
    return () => {
      watchSubscription.current?.remove();
      watchSubscription.current = null;
    };
  }, []);

  const handleEnd = () => {
    if (!sessionId) return;
    Alert.alert('Kết thúc phiên cầu cứu', 'Bạn đã ổn rồi?', [
      { text: 'Chưa', style: 'cancel' },
      {
        text: 'Kết thúc',
        style: 'destructive',
        onPress: async () => {
          setIsEnding(true);
          try {
            await endSosSession(sessionId);
            router.replace('/(app)/home');
          } catch (err: any) {
            Alert.alert('Lỗi', err.message ?? String(err));
          } finally {
            setIsEnding(false);
          }
        },
      },
    ]);
  };

  if (isLoading || !session) {
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
      data={responses}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Đang cầu cứu</Text>
          <View style={[styles.statusCard, session.status === 'accepted' && styles.statusCardOk]}>
            <Text style={styles.statusText}>{STATUS_LABEL[session.status]}</Text>
            {session.mode === 'broadcast' && (
              <Text style={styles.statusSub}>Đã nhờ tất cả lốp — {responses.length} người</Text>
            )}
            {session.status === 'accepted' && !locationError && (
              <Text style={styles.statusSub}>📍 Đang chia sẻ vị trí của bạn cho người giúp</Text>
            )}
            {session.status === 'accepted' && locationError && (
              <Text style={[styles.statusSub, styles.statusError]}>⚠️ {locationError}</Text>
            )}
          </View>
          {responses.length > 0 && <Text style={styles.sectionLabel}>Phản hồi</Text>}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.responseRow}>
          <Text style={styles.responseName}>{item.spare.display_name}</Text>
          <Text
            style={[
              styles.responseStatus,
              item.status === 'accepted' && styles.responseAccepted,
              item.status === 'declined' && styles.responseDeclined,
            ]}
          >
            {RESPONSE_LABEL[item.status]}
          </Text>
        </View>
      )}
      ListFooterComponent={
        session.status !== 'ended' ? (
          <Pressable style={[styles.endButton, isEnding && styles.disabled]} disabled={isEnding} onPress={handleEnd}>
            <Text style={styles.endButtonText}>Kết thúc phiên (đã ổn)</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.endButton} onPress={() => router.replace('/(app)/home')}>
            <Text style={styles.endButtonText}>Về trang chủ</Text>
          </Pressable>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, gap: 0 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 14 },
  statusCard: {
    backgroundColor: colors.accentDim,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  statusCardOk: { backgroundColor: colors.calmDim },
  statusText: { fontSize: 16, fontWeight: '800', color: colors.text },
  statusSub: { fontSize: 13, color: colors.textDim, marginTop: 4 },
  statusError: { color: colors.danger },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: 10,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  responseName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  responseStatus: { fontSize: 12.5, fontWeight: '600', color: colors.textDim },
  responseAccepted: { color: colors.ok },
  responseDeclined: { color: colors.danger },
  endButton: {
    marginTop: 20,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endButtonText: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
  disabled: { opacity: 0.5 },
});
