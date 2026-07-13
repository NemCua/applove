import { useState } from 'react';
import { Link, router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Nhập đầy đủ email và mật khẩu.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (signInError) {
      setError('Đăng nhập thất bại: ' + signInError);
      return;
    }
    router.replace('/(app)/home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Lốp Dự Phòng</Text>
      <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>

        <Link href="/(auth)/signup" style={styles.link}>
          Chưa có tài khoản? Đăng ký
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textDim, marginBottom: 32 },
  form: { width: '100%', maxWidth: 360, gap: 12 },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  link: { color: colors.calm, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
