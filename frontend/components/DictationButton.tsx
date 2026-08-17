import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useTheme } from '../context/ThemeContext';
import { useFontSize } from '../context/FontSizeContext';

const API = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
const RED = '#D32F2F';

interface DictationButtonProps {
  onTranscript: (text: string) => void;
  hint?: string;
}

function extFromUri(uri: string): string {
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  return ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'].includes(ext) ? ext : 'm4a';
}

export default function DictationButton({ onTranscript, hint }: DictationButtonProps) {
  const { theme } = useTheme();
  const { fontSize } = useFontSize();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');

  const showSettingsPrompt = () => {
    if (Platform.OS === 'web') {
      window.alert('Microphone access is blocked. Please allow the microphone in your browser settings.');
      return;
    }
    Alert.alert(
      'Microphone Needed',
      'To dictate with your voice, please allow microphone access in Settings.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const ensureMicPermission = async (): Promise<boolean> => {
    try {
      const current = await AudioModule.getRecordingPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) {
        showSettingsPrompt();
        return false;
      }
      const req = await AudioModule.requestRecordingPermissionsAsync();
      if (req.granted) return true;
      if (!req.canAskAgain) showSettingsPrompt();
      return false;
    } catch (e) {
      console.error('Permission check failed:', e);
      return false;
    }
  };

  const startRecording = async () => {
    setError('');
    const ok = await ensureMicPermission();
    if (!ok) return;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.error('Failed to start recording:', e);
      setError('Could not start the microphone. Please try again.');
    }
  };

  const stopAndTranscribe = async () => {
    try {
      await recorder.stop();
    } catch (e) {
      console.error('Failed to stop recording:', e);
    }
    const uri = recorder.uri;
    if (!uri) {
      setError('No audio was recorded. Please try again.');
      return;
    }
    setTranscribing(true);
    try {
      const form = new FormData();
      const ext = extFromUri(uri);
      if (Platform.OS === 'web') {
        const blob = await fetch(uri).then((r) => r.blob());
        const type = blob.type || 'audio/webm';
        const webExt = type.includes('webm') ? 'webm' : type.includes('mp4') ? 'mp4' : ext;
        form.append('file', new File([blob], `recording.${webExt}`, { type }));
      } else {
        form.append('file', {
          uri,
          name: `recording.${ext}`,
          type: `audio/${ext}`,
        } as any);
      }
      const response = await fetch(`${API}/transcribe`, { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Transcription failed');
      const text = (payload.text || '').trim();
      if (text) {
        onTranscript(text);
      } else {
        setError("We couldn't hear anything. Please speak clearly and try again.");
      }
    } catch (e) {
      console.error('Transcription error:', e);
      setError('Could not convert your speech. Please try again.');
    } finally {
      setTranscribing(false);
    }
  };

  const isRecording = recorderState.isRecording;

  const handlePress = () => {
    if (transcribing) return;
    if (isRecording) {
      stopAndTranscribe();
    } else {
      startRecording();
    }
  };

  const styles = StyleSheet.create({
    wrap: { width: '100%', marginVertical: 8 },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      borderRadius: 18,
      paddingVertical: 20,
      paddingHorizontal: 20,
      minHeight: 72,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    buttonRecording: {
      backgroundColor: RED,
    },
    buttonText: {
      color: '#FFF',
      fontSize: fontSize.header,
      fontWeight: '800',
      marginLeft: 12,
    },
    hintText: {
      fontSize: fontSize.label,
      color: theme.textLight,
      textAlign: 'center',
      marginTop: 6,
    },
    errorText: {
      fontSize: fontSize.label,
      color: RED,
      textAlign: 'center',
      marginTop: 6,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonRecording]}
        onPress={handlePress}
        disabled={transcribing}
        accessibilityRole="button"
        accessibilityLabel={
          isRecording ? 'Stop recording and convert speech to text' : 'Tap to dictate with your voice'
        }
      >
        {transcribing ? (
          <>
            <ActivityIndicator size="small" color="#FFF" />
            <Text style={styles.buttonText}>Converting…</Text>
          </>
        ) : isRecording ? (
          <>
            <Ionicons name="stop-circle" size={36} color="#FFF" />
            <Text style={styles.buttonText}>Listening… Tap to Stop</Text>
          </>
        ) : (
          <>
            <Ionicons name="mic" size={36} color="#FFF" />
            <Text style={styles.buttonText}>Tap to Speak</Text>
          </>
        )}
      </TouchableOpacity>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}
