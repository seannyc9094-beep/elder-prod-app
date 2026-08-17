import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useFontSize } from '../context/FontSizeContext';
import { getDeviceId } from '../utils/deviceId';

const API = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  days: number[];
  notes: string;
  color: string;
  taken_times: string[];
}

const TIME_OPTIONS = ['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PILL_COLORS = ['#E57373', '#FFB74D', '#FFF176', '#81C784', '#64B5F6', '#BA68C8', '#F06292', '#90A4AE'];

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function daysSummary(days: number[]): string {
  if (days.length === 7) return 'Every day';
  return [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(', ');
}

export default function Medications() {
  const { theme } = useTheme();
  const { fontSize } = useFontSize();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(PILL_COLORS[4]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDay = today.getDay();

  const loadMeds = useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${API}/medications?device_id=${deviceId}&date=${todayStr}`);
      const data = await res.json();
      setMeds(data.medications || []);
    } catch (e) {
      console.error('Error loading medications:', e);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadMeds();
  }, [loadMeds]);

  const toggleTaken = async (med: Medication, time: string) => {
    const isTaken = med.taken_times.includes(time);
    // Optimistic update
    setMeds((prev) =>
      prev.map((m) =>
        m.id === med.id
          ? { ...m, taken_times: isTaken ? m.taken_times.filter((t) => t !== time) : [...m.taken_times, time] }
          : m
      )
    );
    try {
      const deviceId = await getDeviceId();
      await fetch(`${API}/medications/${med.id}/toggle-taken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, date: todayStr, time }),
      });
    } catch (e) {
      console.error('Error toggling taken:', e);
      loadMeds();
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setDosage('');
    setTimes([]);
    setDays([0, 1, 2, 3, 4, 5, 6]);
    setNotes('');
    setColor(PILL_COLORS[4]);
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingId(med.id);
    setName(med.name);
    setDosage(med.dosage);
    setTimes(med.times);
    setDays(med.days);
    setNotes(med.notes);
    setColor(med.color);
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!name.trim()) {
      setFormError('Please enter the medication name.');
      return;
    }
    if (times.length === 0) {
      setFormError('Please pick at least one reminder time.');
      return;
    }
    if (days.length === 0) {
      setFormError('Please pick at least one day.');
      return;
    }
    setSaving(true);
    try {
      const deviceId = await getDeviceId();
      const payload = {
        name: name.trim(),
        dosage: dosage.trim(),
        times: [...times].sort(),
        days,
        notes: notes.trim(),
        color,
      };
      const res = editingId
        ? await fetch(`${API}/medications/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${API}/medications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, device_id: deviceId }),
          });
      if (!res.ok) throw new Error('Save failed');
      setModalVisible(false);
      await loadMeds();
    } catch (e) {
      console.error('Error saving medication:', e);
      setFormError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (med: Medication) => {
    try {
      await fetch(`${API}/medications/${med.id}`, { method: 'DELETE' });
      setMeds((prev) => prev.filter((m) => m.id !== med.id));
    } catch (e) {
      console.error('Error deleting medication:', e);
    }
  };

  const handleDelete = (med: Medication) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(`Delete ${med.name}? This cannot be undone.`)) doDelete(med);
      return;
    }
    Alert.alert('Delete Medication', `Delete ${med.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete(med) },
    ]);
  };

  const toggleFormTime = (t: string) => {
    setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const toggleFormDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  // Today's doses
  const todaysDoses = meds
    .filter((m) => m.days.includes(todayDay))
    .flatMap((m) => m.times.map((t) => ({ med: m, time: t })))
    .sort((a, b) => a.time.localeCompare(b.time));
  const takenCount = todaysDoses.filter((d) => d.med.taken_times.includes(d.time)).length;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingRight: 12,
    },
    backText: { fontSize: fontSize.body, color: theme.primary, fontWeight: '600', marginLeft: 4 },
    headerContent: { paddingHorizontal: 20, paddingBottom: 8 },
    title: { fontSize: fontSize.title, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: fontSize.body, color: theme.textLight, marginTop: 4 },
    progressCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressText: { flex: 1, fontSize: fontSize.header, fontWeight: 'bold', color: '#FFF', marginLeft: 14 },
    sectionTitle: {
      fontSize: fontSize.label,
      fontWeight: '700',
      color: theme.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 24,
      marginBottom: 12,
      marginHorizontal: 20,
    },
    doseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: theme.border,
    },
    doseCardTaken: { borderColor: theme.success, opacity: 0.85 },
    colorDot: { width: 18, height: 18, borderRadius: 9, marginRight: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
    doseInfo: { flex: 1 },
    doseTime: { fontSize: fontSize.header, fontWeight: 'bold', color: theme.primary },
    doseName: { fontSize: fontSize.body, fontWeight: '600', color: theme.text, marginTop: 2 },
    doseDosage: { fontSize: fontSize.label, color: theme.textLight, marginTop: 2 },
    takenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      minHeight: 48,
    },
    takenBtnText: { fontSize: fontSize.label, fontWeight: '700', marginLeft: 6 },
    medCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    medColorBar: { height: 8 },
    medCardBody: { padding: 16 },
    medName: { fontSize: fontSize.header, fontWeight: 'bold', color: theme.text },
    medDosage: { fontSize: fontSize.body, color: theme.textLight, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    timeChip: {
      backgroundColor: theme.primary + '20',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 6,
    },
    timeChipText: { fontSize: fontSize.label, fontWeight: '600', color: theme.primary },
    medDays: { fontSize: fontSize.label, color: theme.textLight, marginTop: 6 },
    medNotes: { fontSize: fontSize.label, color: theme.text, marginTop: 8, fontStyle: 'italic' },
    medActions: { flexDirection: 'row', marginTop: 14 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      minHeight: 48,
    },
    editBtn: { backgroundColor: theme.primary + '20', marginRight: 8 },
    deleteBtn: { backgroundColor: theme.clear + '20', marginLeft: 8 },
    actionBtnText: { fontSize: fontSize.label, fontWeight: '700', marginLeft: 6 },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 },
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
      maxHeight: '90%',
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
    notesInput: { minHeight: 80, textAlignVertical: 'top' },
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
    dayChip: {
      width: 44,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    everydayBtn: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.secondary + '25',
    },
    everydayText: { fontSize: fontSize.label, fontWeight: '700', color: theme.secondary },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap' },
    colorSwatch: {
      width: 48,
      height: 48,
      borderRadius: 24,
      marginRight: 10,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorSwatchActive: { borderColor: theme.text },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.clear + '20',
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
    },
    errorText: { flex: 1, fontSize: fontSize.label, color: theme.clear, marginLeft: 8, fontWeight: '600' },
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
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Ionicons name="arrow-back" size={26} color={theme.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Medications</Text>
        <Text style={styles.subtitle}>{format(today, 'EEEE, MMMM d')}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {todaysDoses.length > 0 && (
            <View style={styles.progressCard}>
              <Ionicons name="medkit" size={32} color="#FFF" />
              <Text style={styles.progressText}>
                {takenCount} of {todaysDoses.length} doses taken today
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
          {todaysDoses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cafe-outline" size={56} color={theme.accent} />
              <Text style={styles.emptyText}>Nothing scheduled today</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add a medication reminder</Text>
            </View>
          ) : (
            todaysDoses.map(({ med, time }) => {
              const isTaken = med.taken_times.includes(time);
              return (
                <View key={`${med.id}-${time}`} style={[styles.doseCard, isTaken && styles.doseCardTaken]}>
                  <View style={[styles.colorDot, { backgroundColor: med.color }]} />
                  <View style={styles.doseInfo}>
                    <Text style={styles.doseTime}>{formatTime(time)}</Text>
                    <Text style={styles.doseName}>{med.name}</Text>
                    {med.dosage !== '' && <Text style={styles.doseDosage}>{med.dosage}</Text>}
                  </View>
                  <TouchableOpacity
                    style={[styles.takenBtn, { backgroundColor: isTaken ? theme.success + '30' : theme.primary + '15' }]}
                    onPress={() => toggleTaken(med, time)}
                  >
                    <Ionicons
                      name={isTaken ? 'checkmark-circle' : 'ellipse-outline'}
                      size={30}
                      color={isTaken ? theme.success : theme.primary}
                    />
                    <Text style={[styles.takenBtnText, { color: isTaken ? theme.success : theme.primary }]}>
                      {isTaken ? 'Taken' : 'Take'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <Text style={styles.sectionTitle}>All Medications ({meds.length})</Text>
          {meds.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={56} color={theme.primary} />
              <Text style={styles.emptyText}>No medications yet</Text>
              <Text style={styles.emptySubtext}>Add your first medication with the + button below</Text>
            </View>
          ) : (
            meds.map((med) => (
              <View key={med.id} style={styles.medCard}>
                <View style={[styles.medColorBar, { backgroundColor: med.color }]} />
                <View style={styles.medCardBody}>
                  <Text style={styles.medName}>{med.name}</Text>
                  {med.dosage !== '' && <Text style={styles.medDosage}>{med.dosage}</Text>}
                  <View style={styles.chipsRow}>
                    {med.times.map((t) => (
                      <View key={t} style={styles.timeChip}>
                        <Text style={styles.timeChipText}>{formatTime(t)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.medDays}>
                    <Ionicons name="repeat" size={14} color={theme.textLight} /> {daysSummary(med.days)}
                  </Text>
                  {med.notes !== '' && <Text style={styles.medNotes}>{med.notes}</Text>}
                  <View style={styles.medActions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEditModal(med)}>
                      <Ionicons name="pencil" size={20} color={theme.primary} />
                      <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(med)}>
                      <Ionicons name="trash" size={20} color={theme.clear} />
                      <Text style={[styles.actionBtnText, { color: theme.clear }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={38} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Medication' : 'Add Medication'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={30} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalBody}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Medication Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Metformin"
                    placeholderTextColor={theme.textLight}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.label}>Dosage (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500 mg, 1 tablet"
                    placeholderTextColor={theme.textLight}
                    value={dosage}
                    onChangeText={setDosage}
                  />

                  <Text style={styles.label}>Reminder Times</Text>
                  <View style={styles.chipsRow}>
                    {TIME_OPTIONS.map((t) => {
                      const active = times.includes(t);
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[styles.optionChip, active && styles.optionChipActive]}
                          onPress={() => toggleFormTime(t)}
                        >
                          <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                            {formatTime(t)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Days of the Week</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {DAY_LABELS.map((d, i) => {
                      const active = days.includes(i);
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dayChip, active && styles.optionChipActive]}
                          onPress={() => toggleFormDay(i)}
                        >
                          <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{d[0]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity style={styles.everydayBtn} onPress={() => setDays([0, 1, 2, 3, 4, 5, 6])}>
                    <Text style={styles.everydayText}>Every day</Text>
                  </TouchableOpacity>

                  <Text style={styles.label}>Pill Color Tag</Text>
                  <View style={styles.colorRow}>
                    {PILL_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
                        onPress={() => setColor(c)}
                      >
                        {color === c && <Ionicons name="checkmark" size={26} color="#FFF" />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder="e.g. Take with food"
                    placeholderTextColor={theme.textLight}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />

                  {formError !== '' && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={24} color={theme.clear} />
                      <Text style={styles.errorText}>{formError}</Text>
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Medication'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
