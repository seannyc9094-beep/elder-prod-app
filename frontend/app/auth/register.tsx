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

export default function Register() {
  const { theme } = useTheme();
  const { fontSize } = useFontSize();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match. Please try again.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      router.replace('/(tabs)/settings');
    } catch (e: any) {
      setError(e.message || 'Could not create account. Please try again.');
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
      backgroundColor: theme.secondary + '25',
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
    hint: {
      fontSize: fontSize.label,
      color: theme.textLight,
      marginTop: -12,
      marginBottom: 20,
      marginLeft: 4,
    },
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
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 24,
    },
    footerText: { fontSize: fontSize.body, color: theme.textLight },
    linkText: { fontSize: fontSize.body, color: theme.primary, fontWeight: '600' },
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
            <Ionicons name="person-add" size={44} color={theme.secondary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>It only takes a minute</Text>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={24} color={theme.clear} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Your Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={24} color={theme.textLight} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Mary Smith"
              placeholderTextColor={theme.textLight}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>

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
              placeholder="Choose a password"
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
          <Text style={styles.hint}>At least 6 characters</Text>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={24} color={theme.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Type your password again"
              placeholderTextColor={theme.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/login')}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
