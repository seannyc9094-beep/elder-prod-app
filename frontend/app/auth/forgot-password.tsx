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

export default function ForgotPassword() {
  const { theme } = useTheme();
  const { fontSize } = useFontSize();
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep('reset');
    } catch (e: any) {
      setError(e.message || 'Could not send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (code.trim().length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Could not reset your password. Please try again.');
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
      backgroundColor: theme.accent + '30',
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
      lineHeight: fontSize.body * 1.5,
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
    codeInput: {
      flex: 1,
      fontSize: fontSize.title,
      fontWeight: 'bold',
      letterSpacing: 8,
      color: theme.text,
      marginLeft: 12,
      paddingVertical: 14,
      textAlign: 'center',
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
    successBox: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    successText: {
      fontSize: fontSize.header,
      color: theme.text,
      textAlign: 'center',
      marginTop: 20,
      lineHeight: fontSize.header * 1.4,
    },
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
            <Ionicons name="key" size={44} color={theme.accent} />
          </View>

          {step === 'email' && (
            <>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we will send you a 6-digit code to reset your password.
              </Text>

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

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSendCode} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Code</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 'reset' && (
            <>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to {email.trim()}. Enter it below with your new password.
              </Text>

              {error !== '' && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={24} color={theme.clear} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.label}>6-Digit Code</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="keypad-outline" size={24} color={theme.textLight} />
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor={theme.textLight}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={24} color={theme.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.textLight}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={26} color={theme.textLight} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleReset} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={handleSendCode} disabled={loading}>
                <Text style={styles.linkText}>Send a new code</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={styles.title}>All Done!</Text>
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={80} color={theme.success} />
                <Text style={styles.successText}>
                  Your password has been reset. You can now sign in with your new password.
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth/login')}>
                <Text style={styles.primaryBtnText}>Go to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
