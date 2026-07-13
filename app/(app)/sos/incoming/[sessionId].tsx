import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../../../../lib/theme';
import { supabase } from '../../../../lib/supabase';
import { getSosLocation, getSosSession, respondToSos, type SosLocation, type SosSession } from '../../../../lib/api/sos';

export default function IncomingSos() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<SosSession | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [myStatus, setMyStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [location, setLocation] = useState<SosLocation | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const s = await getSosSession(sessionId);
    setSession(s);
    if (s) {
      const { data: owner } = await supabase.from('profiles').select('display_name').eq('id', s.ownerId).single();
      setOwnerName(owner?.display_name ?? '');

      const { data: userData } = await supabase.auth.getUser();
      const { data: myResponse } = await supabase
        .from('sos_responses')
        .select('status')
        .eq('session_id', sessionId)
        .eq('spare_id', userData.user?.id ?? '')
        .maybeSingle();
      setMyStatus((myResponse?.status as any) ?? 'pending');
    }
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
    const topic = `realtime:sos-incoming-${sessionId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`sos-incoming-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_sessions', filter: `id=eq.${sessionId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, load]);

  // Chỉ subscribe vị trí owner khi mình đúng là người đã được nhận giúp — RLS cũng
  // chặn ở tầng DB, nhưng tự giới hạn ở đây tránh gọi thừa realtime channel.
  useEffect(() => {
    if (!sessionId || myStatus !== 'accepted') return;

    getSosLocation(sessionId)
      .then(setLocation)
      .catch(() => {});

    const topic = `realtime:sos-location-${sessionId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`sos-location-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_locations', filter: `session_id=eq.${sessionId}` },
        () => {
          getSosLocation(sessionId)
            .then(setLocation)
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, myStatus]);

  const respond = async (accept: boolean) => {
    if (!sessionId || isResponding) return;
    setIsResponding(true);
    try {
      await respondToSos(sessionId, accept);
      if (!accept) {
        router.replace('/(app)/home');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? String(err));
      await load();
    } finally {
      setIsResponding(false);
    }
  };

  if (isLoading || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (session.status === 'ended') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Phiên đã kết thúc</Text>
        <Text style={styles.sub}>{ownerName} không còn cần giúp nữa.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
        </Pressable>
      </View>
    );
  }

  if (session.status === 'accepted' && session.acceptedBy && myStatus !== 'accepted') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Đã có người nhận giúp</Text>
        <Text style={styles.sub}>Ai đó khác đã đồng ý giúp {ownerName} rồi.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
        </Pressable>
      </View>
    );
  }

  if (myStatus === 'declined') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Bạn đã từ chối</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
        </Pressable>
      </View>
    );
  }

  if (myStatus === 'accepted') {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Đang giúp</Text>
          <Text style={styles.title}>{ownerName} cần bạn tới giúp</Text>
        </View>

        {location ? (
          <>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                title={ownerName}
                description="Vị trí hiện tại"
              />
            </MapView>
            <Pressable
              style={styles.directionsButton}
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`)
              }
            >
              <Text style={styles.directionsText}>Chỉ đường tới đây</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.sub}>Đang chờ {ownerName} chia sẻ vị trí...</Text>
          </View>
        )}

        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Cầu cứu</Text>
        <Text style={styles.title}>{ownerName} đang cần giúp!</Text>
        <Text style={styles.sub}>
          {session.mode === 'broadcast' ? 'Đã nhờ tất cả lốp — ai đồng ý trước sẽ đi giúp.' : 'Nhờ riêng bạn giúp lần này.'}
        </Text>
      </View>

      <Pressable
        style={[styles.acceptButton, isResponding && styles.disabled]}
        disabled={isResponding}
        onPress={() => respond(true)}
      >
        <Text style={styles.acceptText}>Đồng ý giúp</Text>
      </Pressable>

      <Pressable
        style={[styles.declineButton, isResponding && styles.disabled]}
        disabled={isResponding}
        onPress={() => respond(false)}
      >
        <Text style={styles.declineText}>Từ chối</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center', gap: 14 },
  mapContainer: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  card: {
    backgroundColor: colors.accentDim,
    borderRadius: 20,
    padding: 22,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textDim, marginTop: 6, textAlign: 'center' },
  acceptButton: {
    backgroundColor: colors.ok,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptText: { color: '#08341F', fontWeight: '800', fontSize: 16 },
  declineButton: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  declineText: { color: colors.textDim, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  map: { flex: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  directionsButton: {
    backgroundColor: colors.calm,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  directionsText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
