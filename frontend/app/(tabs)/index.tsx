import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useFontSize } from '../../context/FontSizeContext';
import WeatherWidget from '../../components/WeatherWidget';
import DictationButton from '../../components/DictationButton';

interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  time?: string;
}

type ViewMode = 'day' | 'week' | 'month';

export default function Planner() {
  const { theme } = useTheme();
  const { fontSize } = useFontSize();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem('planner_tasks');
      if (stored) setTasks(JSON.parse(stored));
    } catch (e) {
      console.error('Error loading tasks:', e);
    }
  };

  const saveTasks = async (newTasks: Task[]) => {
    try {
      await AsyncStorage.setItem('planner_tasks', JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (e) {
      console.error('Error saving tasks:', e);
    }
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      date: format(selectedDate, 'yyyy-MM-dd'),
      completed: false,
      time: newTaskTime || undefined,
    };
    saveTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskTime('');
    setModalVisible(false);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter(t => t.id !== id));
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(t => t.date === format(date, 'yyyy-MM-dd'));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    title: {
      fontSize: fontSize.title,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 4,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
    },
    toggleBtnActive: {
      backgroundColor: theme.primary,
    },
    toggleText: {
      fontSize: fontSize.label,
      fontWeight: '600',
      color: theme.textLight,
    },
    toggleTextActive: {
      color: '#FFF',
    },
    dayView: {
      flex: 1,
      padding: 20,
    },
    dateHeader: {
      fontSize: fontSize.header,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 20,
    },
    taskList: {
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 40,
    },
    emptyText: {
      fontSize: fontSize.body,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: fontSize.label,
      color: theme.textLight,
      marginTop: 8,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    taskCompleted: {
      opacity: 0.7,
    },
    checkbox: {
      marginRight: 16,
    },
    taskContent: {
      flex: 1,
    },
    taskTitle: {
      fontSize: fontSize.body,
      fontWeight: '500',
      color: theme.text,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.textLight,
    },
    taskTime: {
      fontSize: fontSize.label,
      color: theme.primary,
      marginTop: 4,
    },
    deleteBtn: {
      padding: 8,
    },
    weekView: {
      flex: 1,
      padding: 16,
    },
    weekDay: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row',
    },
    weekDayToday: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    weekDaySelected: {
      backgroundColor: theme.primary,
    },
    weekDayHeader: {
      width: 60,
    },
    weekDayName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textLight,
    },
    weekDayDate: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    weekDayTextSelected: {
      color: '#FFF',
    },
    weekDayTasks: {
      flex: 1,
      marginLeft: 16,
    },
    weekTaskDot: {
      backgroundColor: theme.secondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 4,
    },
    weekTaskDotCompleted: {
      backgroundColor: theme.border,
    },
    weekTaskText: {
      fontSize: 14,
      color: '#FFF',
    },
    moreTasks: {
      fontSize: 12,
      color: theme.textLight,
      marginTop: 4,
    },
    monthView: {
      flex: 1,
      padding: 16,
    },
    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    monthTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    weekDayLabels: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    weekDayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: theme.textLight,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    monthDay: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    monthDayEmpty: {
      width: '14.28%',
      aspectRatio: 1,
    },
    monthDayToday: {
      backgroundColor: theme.secondary + '30',
    },
    monthDaySelected: {
      backgroundColor: theme.primary,
    },
    monthDayText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    monthDayTextToday: {
      color: theme.secondary,
      fontWeight: 'bold',
    },
    monthDayTextSelected: {
      color: '#FFF',
    },
    taskIndicator: {
      position: 'absolute',
      bottom: 4,
    },
    taskDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    taskDotActive: {
      backgroundColor: theme.accent,
    },
    taskDotDone: {
      backgroundColor: theme.success,
    },
    medsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 18,
      padding: 18,
      marginHorizontal: 20,
      marginBottom: 8,
      minHeight: 76,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    medsIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    sosCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#D32F2F',
      borderRadius: 18,
      padding: 18,
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 8,
      minHeight: 76,
      shadowColor: '#D32F2F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    sosIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    medsCardContent: {
      flex: 1,
    },
    medsCardTitle: {
      fontSize: fontSize.header,
      fontWeight: 'bold',
      color: '#FFF',
    },
    medsCardSubtitle: {
      fontSize: fontSize.label,
      color: 'rgba(255,255,255,0.9)',
      marginTop: 2,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    modalDate: {
      fontSize: 16,
      color: theme.primary,
      marginBottom: 20,
    },
    input: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 18,
      color: theme.text,
      marginBottom: 12,
    },
    modalButtons: {
      flexDirection: 'row',
      marginTop: 12,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelBtn: {
      backgroundColor: theme.border,
      marginRight: 8,
    },
    addBtn: {
      backgroundColor: theme.primary,
      marginLeft: 8,
    },
    cancelBtnText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textLight,
    },
    addBtnText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFF',
    },
  });

  const renderDayView = () => {
    const dayTasks = getTasksForDate(selectedDate);
    return (
      <View style={styles.dayView}>
        <WeatherWidget />
        <Text style={styles.dateHeader}>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </Text>
        <ScrollView style={styles.taskList}>
          {dayTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="sunny-outline" size={60} color={theme.accent} />
              <Text style={styles.emptyText}>No tasks for today</Text>
              <Text style={styles.emptySubtext}>Tap + to add a task</Text>
            </View>
          ) : (
            dayTasks.map(task => (
              <View key={task.id} style={[styles.taskItem, task.completed && styles.taskCompleted]}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleTask(task.id)}
                >
                  <Ionicons
                    name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={32}
                    color={task.completed ? theme.success : theme.primary}
                  />
                </TouchableOpacity>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                    {task.title}
                  </Text>
                  {task.time && <Text style={styles.taskTime}>{task.time}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteTask(task.id)}
                >
                  <Ionicons name="trash-outline" size={24} color={theme.warning} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <View style={styles.weekView}>
        <ScrollView>
          {weekDays.map(day => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.weekDay,
                  isToday && styles.weekDayToday,
                  isSelected && styles.weekDaySelected,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <View style={styles.weekDayHeader}>
                  <Text style={[styles.weekDayName, isSelected && styles.weekDayTextSelected]}>
                    {format(day, 'EEE')}
                  </Text>
                  <Text style={[styles.weekDayDate, isSelected && styles.weekDayTextSelected]}>
                    {format(day, 'd')}
                  </Text>
                </View>
                <View style={styles.weekDayTasks}>
                  {dayTasks.slice(0, 3).map(task => (
                    <View key={task.id} style={[styles.weekTaskDot, task.completed && styles.weekTaskDotCompleted]}>
                      <Text style={styles.weekTaskText} numberOfLines={1}>{task.title}</Text>
                    </View>
                  ))}
                  {dayTasks.length > 3 && (
                    <Text style={styles.moreTasks}>+{dayTasks.length - 3} more</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPadding = monthStart.getDay();

    return (
      <View style={styles.monthView}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => setSelectedDate(subMonths(selectedDate, 1))}>
            <Ionicons name="chevron-back" size={32} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{format(selectedDate, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setSelectedDate(addMonths(selectedDate, 1))}>
            <Ionicons name="chevron-forward" size={32} color={theme.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekDayLabels}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDayLabel}>{day}</Text>
          ))}
        </View>
        <View style={styles.monthGrid}>
          {Array.from({ length: startPadding }).map((_, i) => (
            <View key={`pad-${i}`} style={styles.monthDayEmpty} />
          ))}
          {days.map(day => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.monthDay,
                  isToday && styles.monthDayToday,
                  isSelected && styles.monthDaySelected,
                ]}
                onPress={() => {
                  setSelectedDate(day);
                  setViewMode('day');
                }}
              >
                <Text style={[
                  styles.monthDayText,
                  isToday && styles.monthDayTextToday,
                  isSelected && styles.monthDayTextSelected,
                ]}>
                  {format(day, 'd')}
                </Text>
                {dayTasks.length > 0 && (
                  <View style={styles.taskIndicator}>
                    <View style={[styles.taskDot, dayTasks.some(t => !t.completed) ? styles.taskDotActive : styles.taskDotDone]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Planner</Text>
        <View style={styles.viewToggle}>
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.medsCard} onPress={() => router.push('/medications')}>
        <View style={styles.medsIconCircle}>
          <Ionicons name="medkit" size={28} color="#FFF" />
        </View>
        <View style={styles.medsCardContent}>
          <Text style={styles.medsCardTitle}>Medications</Text>
          <Text style={styles.medsCardSubtitle}>Tap to view today&apos;s reminders</Text>
        </View>
        <Ionicons name="chevron-forward" size={28} color="#FFF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.sosCard} onPress={() => router.push('/emergency')}>
        <View style={styles.sosIconCircle}>
          <Ionicons name="warning" size={28} color="#FFF" />
        </View>
        <View style={styles.medsCardContent}>
          <Text style={styles.medsCardTitle}>Emergency SOS</Text>
          <Text style={styles.medsCardSubtitle}>Tap to open the SOS button &amp; contacts</Text>
        </View>
        <Ionicons name="chevron-forward" size={28} color="#FFF" />
      </TouchableOpacity>

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={36} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            <Text style={styles.modalDate}>
              For: {format(selectedDate, 'EEEE, MMMM d')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor={theme.textLight}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <DictationButton
              hint="Or speak your task instead of typing"
              onTranscript={(text) =>
                setNewTaskTitle((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Time (optional, e.g., 2:00 PM)"
              placeholderTextColor={theme.textLight}
              value={newTaskTime}
              onChangeText={setNewTaskTime}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.addBtn]}
                onPress={addTask}
              >
                <Text style={styles.addBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
