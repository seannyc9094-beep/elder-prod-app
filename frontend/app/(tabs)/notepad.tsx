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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import DictationButton from '../../components/DictationButton';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export default function Notepad() {
  const { theme, isDark } = useTheme();
  // More vibrant note colors that stand out
  const noteColors = isDark 
    ? ['#5A189A', '#7B2CBF', '#9D4EDD', '#6A0DAD', '#8B5CF6', '#4C1D95']
    : ['#FFE082', '#A5D6A7', '#90CAF9', '#F48FB1', '#CE93D8', '#FFAB91'];

  const [notes, setNotes] = useState<Note[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState(noteColors[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    setNoteColor(noteColors[0]);
  }, [isDark]);

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem('notes');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.sort((a: Note, b: Note) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setNotes(parsed);
      }
    } catch (e) {
      console.error('Error loading notes:', e);
    }
  };

  const saveNotes = async (newNotes: Note[]) => {
    try {
      await AsyncStorage.setItem('notes', JSON.stringify(newNotes));
      setNotes(newNotes);
    } catch (e) {
      console.error('Error saving notes:', e);
    }
  };

  const openNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteColor(noteColors[0]);
    setModalVisible(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteColor(note.color);
    setModalVisible(true);
  };

  const saveNote = () => {
    const now = new Date().toISOString();
    if (editingNote) {
      const updated = notes.map(n =>
        n.id === editingNote.id
          ? { ...n, title: noteTitle, content: noteContent, color: noteColor, updatedAt: now }
          : n
      );
      updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      saveNotes(updated);
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        title: noteTitle || 'Untitled Note',
        content: noteContent,
        color: noteColor,
        createdAt: now,
        updatedAt: now,
      };
      saveNotes([newNote, ...notes]);
    }
    setModalVisible(false);
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textLight,
      marginTop: 4,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 14,
      borderRadius: 14,
    },
    searchInput: {
      flex: 1,
      fontSize: 18,
      color: theme.text,
      marginLeft: 10,
    },
    notesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    notesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    noteCard: {
      width: '48%',
      padding: 16,
      borderRadius: 16,
      marginBottom: 16,
      minHeight: 150,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    noteTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : theme.text,
      marginBottom: 8,
    },
    noteContent: {
      fontSize: 14,
      color: isDark ? '#E8D5F5' : theme.textLight,
      lineHeight: 20,
      flex: 1,
    },
    noteDate: {
      fontSize: 12,
      color: isDark ? '#D4B8E8' : theme.textLight,
      marginTop: 12,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 16,
      color: theme.textLight,
      marginTop: 8,
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
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'android' ? 40 : 12,
    },
    modalCloseBtn: {
      padding: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#FFF' : theme.text,
    },
    modalSaveBtn: {
      padding: 8,
    },
    colorPicker: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: isDark ? '#FFF' : theme.text,
    },
    titleInput: {
      fontSize: 26,
      fontWeight: '600',
      color: isDark ? '#FFF' : theme.text,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    contentInput: {
      flex: 1,
      fontSize: 18,
      color: isDark ? '#FFF' : theme.text,
      paddingHorizontal: 20,
      lineHeight: 28,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Notes</Text>
        <Text style={styles.subtitle}>{notes.length} notes</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={22} color={theme.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={theme.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={22} color={theme.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.notesContainer}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={80} color={theme.border} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching notes' : 'No notes yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Tap + to create your first note'}
            </Text>
          </View>
        ) : (
          <View style={styles.notesGrid}>
            {filteredNotes.map(note => (
              <TouchableOpacity
                key={note.id}
                style={[styles.noteCard, { backgroundColor: note.color }]}
                onPress={() => openEditNote(note)}
                onLongPress={() => deleteNote(note.id)}
              >
                <Text style={styles.noteTitle} numberOfLines={1}>
                  {note.title}
                </Text>
                <Text style={styles.noteContent} numberOfLines={4}>
                  {note.content}
                </Text>
                <Text style={styles.noteDate}>
                  {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openNewNote}>
        <Ionicons name="add" size={36} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: noteColor }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={28} color={isDark ? '#FFF' : theme.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingNote ? 'Edit Note' : 'New Note'}
              </Text>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveNote}>
                <Ionicons name="checkmark" size={28} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
              {noteColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    noteColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNoteColor(color)}
                >
                  {noteColor === color && (
                    <Ionicons name="checkmark" size={20} color={isDark ? '#FFF' : theme.text} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.titleInput}
              placeholder="Note title"
              placeholderTextColor={isDark ? '#888' : theme.textLight}
              value={noteTitle}
              onChangeText={setNoteTitle}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="Start writing..."
              placeholderTextColor={isDark ? '#888' : theme.textLight}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              textAlignVertical="top"
            />

            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <DictationButton
                hint="Speak and your words will be added to the note"
                onTranscript={(text) =>
                  setNoteContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n${text}` : text))
                }
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
