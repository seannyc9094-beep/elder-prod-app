import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { useFontSize } from '../context/FontSizeContext';
import { getDeviceId } from '../utils/deviceId';

const API = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
const HOLD_DURATION_MS = 3000;

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}

const RELATIONSHIP_OPTIONS = [
  'Family',
  'Spouse',
  'Son',
  'Daughter',
  'Sibling',
  'Neighbour',
  'Doctor',
  'Caregiver',
  'Friend',
  'Other',
];

function digitsOnly(s: string): string {
  return s.replace(/[^\d+]/g, '');
}

export default function Emergency() {
  const { theme, isDark } = useTheme();
  const { fontSize } = useFontSize();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIP_OPTIONS[0]);
  const [phone, setPhone] = useState('');

  const [holding, setHolding] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [triggeredContact, setTriggeredContact] = useState<EmergencyContact | null>(null);
  const [sosCoords, setSosCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Animated hold progress (0 -> 1)
  const progress = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);
  const hapticTick = useRef<ReturnType<typeof setInterval> | null>(null);

  const RED = '#D32F2F';
  const RED_DARK = '#B71C1C';

  // Pulse on idle
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseScale]);

  const loadContacts = useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${API}/emergency/contacts?device_id=${deviceId}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (e) {
      console.error('Error loading contacts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const cleanupHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (hapticTick.current) {
      clearInterval(hapticTick.current);
      hapticTick.current = null;
    }
    if (holdAnim.current) {
      holdAnim.current.stop();
      holdAnim.current = null;
    }
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    setHolding(false);
  }, [progress]);

  const captureLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') return null;
      // Race GPS fix against an 8s timeout so the SOS flow never hangs
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (loc) return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      const last = await Location.getLastKnownPositionAsync();
      if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };
      return null;
    } catch (e) {
      console.error('Location capture failed:', e);
      return null;
    }
  }, []);

  const triggerAlert = useCallback(async () => {
    setTriggered(true);
    setSosCoords(null);
    setLocating(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } catch {}
    const top = contacts[0] || null;
    setTriggeredContact(top);
    const coords = await captureLocation();
    setSosCoords(coords);
    setLocating(false);
    try {
      const deviceId = await getDeviceId();
      await fetch(`${API}/emergency/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          message: 'SOS triggered from Emergency dashboard',
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          contact_id: top?.id,
          triggered_from: 'sos_button',
        }),
      });
    } catch (e) {
      console.error('Failed to log alert:', e);
    }
  }, [contacts, captureLocation]);

  const smsAllContacts = useCallback(async () => {
    const numbers = contacts.map((c) => digitsOnly(c.phone)).filter(Boolean);
    if (numbers.length === 0) return;
    const body = sosCoords
      ? `EMERGENCY! I need help. My location: https://maps.google.com/?q=${sosCoords.lat},${sosCoords.lng}`
      : 'EMERGENCY! I need help. Please call me right away.';
    const recipients = numbers.join(',');
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${recipients}${separator}body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else if (Platform.OS === 'web') {
        window.open(url, '_self');
      } else {
        Alert.alert('Cannot send text', 'This device does not support text messages.');
      }
    } catch (e) {
      console.error('Failed to open SMS composer:', e);
    }
  }, [contacts, sosCoords]);

  const startHold = useCallback(() => {
    if (triggered) return;
    setHolding(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    holdAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnim.current.start();
    // Escalating haptic ticks each second
    let ticks = 0;
    hapticTick.current = setInterval(() => {
      ticks += 1;
      try {
        Haptics.impactAsync(
          ticks < 2 ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy
        ).catch(() => {});
      } catch {}
    }, 1000);
    holdTimer.current = setTimeout(() => {
      cleanupHold();
      triggerAlert();
    }, HOLD_DURATION_MS);
  }, [progress, triggered, cleanupHold, triggerAlert]);

  const endHold = useCallback(() => {
    if (triggered) return;
    cleanupHold();
  }, [triggered, cleanupHold]);

  const callContact = useCallback(async (contact: EmergencyContact | null) => {
    if (!contact) return;
    const cleaned = digitsOnly(contact.phone);
    if (!cleaned) return;
    const url = `tel:${cleaned}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else if (Platform.OS === 'web') {
        window.open(url, '_self');
      } else {
        Alert.alert('Cannot place call', 'This device does not support phone calls.');
      }
    } catch (e) {
      console.error('Failed to open dialer:', e);
    }
  }, []);

  const dismissTriggered = () => {
    setTriggered(false);
    setTriggeredContact(null);
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setRelationship(RELATIONSHIP_OPTIONS[0]);
    setPhone('');
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (c: EmergencyContact) => {
    setEditingId(c.id);
    setName(c.name);
    setRelationship(c.relationship || RELATIONSHIP_OPTIONS[0]);
    setPhone(c.phone);
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!name.trim()) {
      setFormError('Please enter the contact name.');
      return;
    }
    const cleaned = digitsOnly(phone);
    if (cleaned.length < 7) {
      setFormError('Please enter a valid phone number.');
      return;
    }
    setSaving(true);
    try {
      const deviceId = await getDeviceId();
      // Determine priority
      let priority = 0;
      if (editingId) {
        const existing = contacts.find((c) => c.id === editingId);
        priority = existing?.priority ?? 0;
      } else {
        priority = contacts.length; // new contact appended at end
      }
      const payload = {
        name: name.trim(),
        relationship: relationship.trim(),
        phone: phone.trim(),
        priority,
      };
      const res = editingId
        ? await fetch(`${API}/emergency/contacts/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${API}/emergency/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, device_id: deviceId }),
          });
      if (!res.ok) throw new Error('Save failed');
      setModalVisible(false);
      await loadContacts();
    } catch (e) {
      console.error('Error saving contact:', e);
      setFormError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (c: EmergencyContact) => {
    try {
      await fetch(`${API}/emergency/contacts/${c.id}`, { method: 'DELETE' });
      setContacts((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      console.error('Error deleting contact:', e);
    }
  };

  const handleDelete = (c: EmergencyContact) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${c.name}? This cannot be undone.`)) doDelete(c);
      return;
    }
    Alert.alert('Delete Contact', `Delete ${c.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete(c) },
    ]);
  };

  const movePriority = async (c: EmergencyContact, direction: -1 | 1) => {
    const idx = contacts.findIndex((x) => x.id === c.id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= contacts.length) return;
    const other = contacts[swapIdx];
    // Swap priorities locally + on server
    const newContacts = [...contacts];
    newContacts[idx] = { ...c, priority: swapIdx };
    newContacts[swapIdx] = { ...other, priority: idx };
    newContacts.sort((a, b) => a.priority - b.priority);
    setContacts(newContacts);
    try {
      await Promise.all([
        fetch(`${API}/emergency/contacts/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: c.name,
            relationship: c.relationship,
            phone: c.phone,
            priority: swapIdx,
          }),
        }),
        fetch(`${API}/emergency/contacts/${other.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: other.name,
            relationship: other.relationship,
            phone: other.phone,
            priority: idx,
          }),
        }),
      ]);
    } catch (e) {
      console.error('Error reordering:', e);
      loadContacts();
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 12 },
    backText: { fontSize: fontSize.body, color: theme.primary, fontWeight: '600', marginLeft: 4 },
    headerContent: { paddingHorizontal: 20, paddingBottom: 8 },
    title: { fontSize: fontSize.title, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: fontSize.body, color: theme.textLight, marginTop: 4 },

    sosSection: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 20,
    },
    sosHint: {
      fontSize: fontSize.header,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    sosSubHint: {
      fontSize: fontSize.body,
      color: theme.textLight,
      textAlign: 'center',
      marginBottom: 24,
    },
    sosRing: {
      width: 280,
      height: 280,
      borderRadius: 140,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,80,80,0.14)' : 'rgba(211,47,47,0.10)',
      borderWidth: 4,
      borderColor: isDark ? 'rgba(255,120,120,0.35)' : 'rgba(211,47,47,0.25)',
    },
    sosButton: {
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: RED,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: RED,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 6,
      borderColor: '#FFF',
    },
    sosButtonHolding: {
      backgroundColor: RED_DARK,
    },
    sosLabel: {
      color: '#FFF',
      fontSize: fontSize.title,
      fontWeight: '900',
      letterSpacing: 2,
    },
    sosSubLabel: {
      color: '#FFF',
      fontSize: fontSize.body,
      fontWeight: '700',
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    progressBarWrap: {
      width: 240,
      height: 12,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
      overflow: 'hidden',
      marginTop: 20,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: RED,
      borderRadius: 6,
    },
    holdCountdown: {
      marginTop: 12,
      fontSize: fontSize.body,
      fontWeight: '700',
      color: RED,
      minHeight: 22,
    },

    sectionTitle: {
      fontSize: fontSize.label,
      fontWeight: '700',
      color: theme.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 20,
      marginBottom: 12,
      marginHorizontal: 20,
    },
    contactCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.border,
    },
    contactCardTop: {
      borderColor: RED,
      borderWidth: 3,
    },
    contactRow: { flexDirection: 'row', alignItems: 'center' },
    priorityBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    priorityBadgeTop: { backgroundColor: RED },
    priorityBadgeText: { color: '#FFF', fontSize: fontSize.header, fontWeight: '900' },
    contactInfo: { flex: 1 },
    contactName: { fontSize: fontSize.header, fontWeight: 'bold', color: theme.text },
    contactRelation: { fontSize: fontSize.label, color: theme.textLight, marginTop: 2 },
    contactPhone: { fontSize: fontSize.body, color: theme.text, marginTop: 4, fontWeight: '600' },
    callBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2E7D32',
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 14,
      minHeight: 52,
    },
    callBtnText: { color: '#FFF', fontSize: fontSize.body, fontWeight: '800', marginLeft: 8 },
    contactActions: {
      flexDirection: 'row',
      marginTop: 14,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      minHeight: 48,
    },
    actionBtnText: { fontSize: fontSize.label, fontWeight: '700', marginLeft: 6 },
    reorderBtn: { backgroundColor: theme.primary + '20', marginRight: 6, flex: 0, paddingHorizontal: 12 },
    editBtn: { backgroundColor: theme.primary + '20', marginHorizontal: 4 },
    deleteBtn: { backgroundColor: '#E5737320', marginLeft: 4 },

    emptyState: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 30 },
    emptyText: { fontSize: fontSize.header, fontWeight: '600', color: theme.text, marginTop: 16, textAlign: 'center' },
    emptySubtext: { fontSize: fontSize.body, color: theme.textLight, marginTop: 8, textAlign: 'center' },

    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: { fontSize: fontSize.header, fontWeight: 'bold', color: theme.text },
    modalBody: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    label: { fontSize: fontSize.body, fontWeight: '600', color: theme.text, marginBottom: 8, marginTop: 16 },
    input: {
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 16,
      fontSize: fontSize.body,
      color: theme.text,
      minHeight: 56,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    optionChip: {
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.background,
      minHeight: 48,
      justifyContent: 'center',
    },
    optionChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    optionChipText: { fontSize: fontSize.label, fontWeight: '600', color: theme.text },
    optionChipTextActive: { color: '#FFF' },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E5737320',
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
    },
    errorText: { flex: 1, fontSize: fontSize.label, color: RED, marginLeft: 8, fontWeight: '600' },

    modalButtons: { flexDirection: 'row', marginTop: 24 },
    modalBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    cancelBtn: { backgroundColor: theme.border, marginRight: 8 },
    saveBtn: { backgroundColor: theme.primary, marginLeft: 8 },
    cancelBtnText: { fontSize: fontSize.body, fontWeight: '600', color: theme.text },
    saveBtnText: { fontSize: fontSize.body, fontWeight: '700', color: '#FFF' },

    // Triggered modal
    triggeredOverlay: {
      flex: 1,
      backgroundColor: 'rgba(211,47,47,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    triggeredCard: {
      backgroundColor: '#FFF',
      borderRadius: 24,
      padding: 28,
      width: '100%',
      maxWidth: 440,
      alignItems: 'center',
    },
    triggeredTitle: {
      fontSize: fontSize.title,
      fontWeight: '900',
      color: RED,
      marginTop: 12,
      textAlign: 'center',
    },
    triggeredSub: {
      fontSize: fontSize.body,
      color: '#2C3E50',
      textAlign: 'center',
      marginTop: 8,
    },
    triggeredContactBox: {
      backgroundColor: '#FFF3F3',
      borderWidth: 2,
      borderColor: RED,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
      width: '100%',
    },
    triggeredContactName: { fontSize: fontSize.header, fontWeight: '800', color: '#2C3E50' },
    triggeredContactPhone: { fontSize: fontSize.body, color: '#2C3E50', marginTop: 4, fontWeight: '600' },
    triggeredCall: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2E7D32',
      borderRadius: 16,
      paddingVertical: 18,
      marginTop: 20,
      width: '100%',
      minHeight: 60,
    },
    triggeredCallText: { color: '#FFF', fontSize: fontSize.header, fontWeight: '900', marginLeft: 10 },
    locationStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      paddingHorizontal: 8,
    },
    locationStatusText: {
      fontSize: fontSize.label,
      color: '#2C3E50',
      fontWeight: '600',
      marginLeft: 8,
      flexShrink: 1,
      textAlign: 'center',
    },
    smsAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1565C0',
      borderRadius: 16,
      paddingVertical: 18,
      marginTop: 12,
      width: '100%',
      minHeight: 60,
    },
    smsAllBtnText: { color: '#FFF', fontSize: fontSize.header, fontWeight: '900', marginLeft: 10 },
    triggeredDismiss: {
      marginTop: 14,
      paddingVertical: 14,
      alignItems: 'center',
      width: '100%',
    },
    triggeredDismissText: { color: '#2C3E50', fontSize: fontSize.body, fontWeight: '700' },
  });

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <Ionicons name="arrow-back" size={26} color={theme.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.subtitle}>Hold the red button for 3 seconds to send an SOS</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.sosSection}>
          <Text style={styles.sosHint}>Need help right now?</Text>
          <Text style={styles.sosSubHint}>Press and hold the button below for 3 seconds</Text>

          <Animated.View style={[styles.sosRing, { transform: [{ scale: holding ? 1 : pulseScale }] }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.sosButton, holding && styles.sosButtonHolding]}
              onPressIn={startHold}
              onPressOut={endHold}
              accessibilityLabel="Hold for SOS. Press and hold 3 seconds to send an alert"
              accessibilityRole="button"
            >
              <Ionicons name="warning" size={54} color="#FFF" />
              <Text style={styles.sosLabel}>SOS</Text>
              <Text style={styles.sosSubLabel}>HOLD FOR 3 SECONDS</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.progressBarWrap}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.holdCountdown}>
            {holding ? 'Keep holding…' : ' '}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Emergency Contacts ({contacts.length})</Text>

        {loading ? (
          <View style={{ paddingVertical: 30 }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={theme.primary} />
            <Text style={styles.emptyText}>No contacts yet</Text>
            <Text style={styles.emptySubtext}>
              Add family or friends who should be called first in an emergency.
            </Text>
          </View>
        ) : (
          contacts.map((c, i) => {
            const isTop = i === 0;
            return (
              <View key={c.id} style={[styles.contactCard, isTop && styles.contactCardTop]}>
                <View style={styles.contactRow}>
                  <View style={[styles.priorityBadge, isTop && styles.priorityBadgeTop]}>
                    <Text style={styles.priorityBadgeText}>{i + 1}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    {!!c.relationship && <Text style={styles.contactRelation}>{c.relationship}</Text>}
                    <Text style={styles.contactPhone}>{c.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => callContact(c)}
                    accessibilityLabel={`Call ${c.name}`}
                  >
                    <Ionicons name="call" size={22} color="#FFF" />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.reorderBtn]}
                    onPress={() => movePriority(c, -1)}
                    disabled={i === 0}
                    accessibilityLabel="Move up in priority"
                  >
                    <Ionicons name="arrow-up" size={20} color={i === 0 ? theme.textLight : theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.reorderBtn]}
                    onPress={() => movePriority(c, 1)}
                    disabled={i === contacts.length - 1}
                    accessibilityLabel="Move down in priority"
                  >
                    <Ionicons
                      name="arrow-down"
                      size={20}
                      color={i === contacts.length - 1 ? theme.textLight : theme.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEditModal(c)}>
                    <Ionicons name="pencil" size={20} color={theme.primary} />
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(c)}>
                    <Ionicons name="trash" size={20} color={RED} />
                    <Text style={[styles.actionBtnText, { color: RED }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal} accessibilityLabel="Add emergency contact">
        <Ionicons name="add" size={38} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Contact' : 'Add Contact'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={30} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalBody}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Sarah Thompson"
                    placeholderTextColor={theme.textLight}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />

                  <Text style={styles.label}>Relationship</Text>
                  <View style={styles.chipsRow}>
                    {RELATIONSHIP_OPTIONS.map((r) => {
                      const active = relationship === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[styles.optionChip, active && styles.optionChipActive]}
                          onPress={() => setRelationship(r)}
                        >
                          <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +1 416 555 1234"
                    placeholderTextColor={theme.textLight}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />

                  {formError !== '' && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={24} color={RED} />
                      <Text style={styles.errorText}>{formError}</Text>
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.saveBtn]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>
                          {editingId ? 'Save Changes' : 'Add Contact'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Triggered Modal */}
      <Modal visible={triggered} animationType="fade" transparent onRequestClose={dismissTriggered}>
        <View style={styles.triggeredOverlay}>
          <View style={styles.triggeredCard}>
            <Ionicons name="alert-circle" size={72} color={RED} />
            <Text style={styles.triggeredTitle}>SOS ALERT SENT</Text>
            <Text style={styles.triggeredSub}>
              {triggeredContact
                ? 'Tap the button below to call your top emergency contact now.'
                : 'You have no emergency contacts yet. Please add one so we can call them next time.'}
            </Text>

            <View style={styles.locationStatusRow}>
              {locating ? (
                <>
                  <ActivityIndicator size="small" color={RED} />
                  <Text style={styles.locationStatusText}>Getting your location…</Text>
                </>
              ) : sosCoords ? (
                <>
                  <Ionicons name="location" size={22} color="#2E7D32" />
                  <Text style={styles.locationStatusText}>Your location was captured and will be shared.</Text>
                </>
              ) : (
                <>
                  <Ionicons name="location-outline" size={22} color="#9E9E9E" />
                  <Text style={styles.locationStatusText}>Location unavailable — alert sent without it.</Text>
                </>
              )}
            </View>

            {triggeredContact && (
              <>
                <View style={styles.triggeredContactBox}>
                  <Text style={styles.triggeredContactName}>{triggeredContact.name}</Text>
                  {!!triggeredContact.relationship && (
                    <Text style={styles.contactRelation}>{triggeredContact.relationship}</Text>
                  )}
                  <Text style={styles.triggeredContactPhone}>{triggeredContact.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.triggeredCall}
                  onPress={() => callContact(triggeredContact)}
                  accessibilityLabel={`Call ${triggeredContact.name} now`}
                >
                  <Ionicons name="call" size={30} color="#FFF" />
                  <Text style={styles.triggeredCallText}>CALL NOW</Text>
                </TouchableOpacity>
              </>
            )}

            {contacts.length > 0 && (
              <TouchableOpacity
                style={styles.smsAllBtn}
                onPress={smsAllContacts}
                disabled={locating}
                accessibilityLabel="Text all emergency contacts with your location"
              >
                <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
                <Text style={styles.smsAllBtnText}>TEXT ALL CONTACTS</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.triggeredDismiss} onPress={dismissTriggered}>
              <Text style={styles.triggeredDismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
