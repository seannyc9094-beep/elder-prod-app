import React from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';
import { ThemeProvider } from '../context/ThemeContext';
import { FontSizeProvider } from '../context/FontSizeContext';
import { AuthProvider } from '../context/AuthContext';
import { useFonts } from 'expo-font';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0' }}>
      <ActivityIndicator size="large" color="#5B8FB9" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#2C3E50' }}>Loading...</Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <FontSizeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="medications" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/forgot-password" />
          </Stack>
        </AuthProvider>
      </FontSizeProvider>
    </ThemeProvider>
  );
}
