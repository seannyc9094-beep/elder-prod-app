import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useFontSize } from '../../context/FontSizeContext';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { theme } = useTheme();
  const { fontSize } = useFontSize();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)/settings');
    } catch (e: any) {
      setError(e.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      alignSelf: 'flex-start',
    },
    backText: { fontSize: fontSize.body, color: theme.primary, fontWeight: '600', marginLeft: 6 },
    content: { paddingHorizontal: 24, paddingBottom: 40 },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: fontSize.title,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: fontSize.body,
      color: theme.textLight,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 28,
    },
    label: {
      fontSize: fontSize.body,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      marginLeft: 4,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      minHeight: 60,
      marginBottom: 20,
    },
    input: {
      flex: 1,
      fontSize: fontSize.body,
      color: theme.text,
      marginLeft: 12,
      paddingVertical: 14,
    },
    eyeBtn: { padding: 8 },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.clear + '20',
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    errorText: { flex: 1, fontSize: fontSize.label, color: theme.clear, marginLeft: 8, fontWeight: '600' },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      minHeight: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryBtnText: { fontSize: fontSize.header, fontWeight: 'bold', color: '#FFF' },
    linkBtn: { alignItems: 'center', paddingVertical: 16 },
    linkText: { fontSize: fontSize.body, color: theme.primary, fontWeight: '600' },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 12,
    },
    footerText: { fontSize: fontSize.body, color: theme.textLight },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color={theme.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={44} color={theme.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={24} color={theme.clear} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={24} color={theme.textLight} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={theme.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={24} color={theme.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={theme.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={26} color={theme.textLight} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/auth/forgot-password')}>
            <Text style={styles.linkText}>Forgot your password?</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New here? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/register')}>
              <Text style={styles.linkText}>Create an Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
