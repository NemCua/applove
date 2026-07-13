import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../lib/theme';
import { createInviteCode, redeemInviteCode } from '../../lib/api/invites';

export default function AddSpare() {
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setIsRedeeming(true);
    try {
      const result = await redeemInviteCode(code);
      Alert.alert('Thành công', `Bạn đã trở thành lốp dự phòng của ${result.ownerDisplayName}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Không nhập được mã', err.message ?? String(err));
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { code: newCode } = await createInviteCode();
      setGeneratedCode(newCode);
    } catch (err: any) {
      Alert.alert('Lỗi tạo mã mời', err.message ?? String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = () => {
    if (!generatedCode) return;
    Share.share({
      message: `Thêm mình làm lốp dự phòng trên Lốp Dự Phòng nhé! Mã mời: ${generatedCode} (hết hạn sau 24h)`,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thêm lốp</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Nhập mã mời của người khác</Text>
        <Text style={styles.sectionSub}>Bạn sẽ trở thành lốp dự phòng của người tạo mã.</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập mã mời"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
        />
        <Pressable style={styles.button} onPress={handleRedeem} disabled={isRedeeming || !code.trim()}>
          {isRedeeming ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác nhận</Text>}
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Mời người khác làm lốp của bạn</Text>
        <Text style={styles.sectionSub}>Tạo mã dùng 1 lần, hết hạn sau 24 giờ, rồi gửi cho bạn bè.</Text>

        {generatedCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{generatedCode}</Text>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Chia sẻ mã</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.outlineButton} onPress={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.outlineButtonText}>Tạo mã mời mới</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 32 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 24 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  sectionSub: { fontSize: 12.5, color: colors.textDim, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 28 },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineButtonText: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
  codeBox: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.calm,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  codeText: { fontSize: 28, fontWeight: '800', color: colors.calm, letterSpacing: 4 },
  shareButton: {
    backgroundColor: colors.calm,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  shareButtonText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
});
