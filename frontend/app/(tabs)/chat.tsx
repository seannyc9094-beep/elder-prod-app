import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useFontSize } from '../../context/FontSizeContext';
import Constants from 'expo-constants';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const API_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'https://easy-productivity-1.preview.emergentagent.com';

export default function Chat() {
  const { theme } = useTheme();
  const { fontSize } = useFontSize();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession);
    }
  }, [currentSession]);

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions`);
      const data = await response.json();
      setSessions(data);
      if (data.length > 0 && !currentSession) {
        setCurrentSession(data[0].id);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`);
      const data = await response.json();
      setMessages(data);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions`, {
        method: 'POST',
      });
      const data = await response.json();
      setSessions([data, ...sessions]);
      setCurrentSession(data.id);
      setMessages([]);
      setShowSessions(false);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
                method: 'DELETE',
              });
              const newSessions = sessions.filter(s => s.id !== sessionId);
              setSessions(newSessions);
              if (currentSession === sessionId) {
                setCurrentSession(newSessions.length > 0 ? newSessions[0].id : null);
                setMessages([]);
              }
            } catch (error) {
              console.error('Error deleting session:', error);
            }
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    let sessionId = currentSession;
    
    // Create a new session if none exists
    if (!sessionId) {
      try {
        const response = await fetch(`${API_URL}/api/chat/sessions`, {
          method: 'POST',
        });
        const data = await response.json();
        sessionId = data.id;
        setSessions([data, ...sessions]);
        setCurrentSession(data.id);
      } catch (error) {
        console.error('Error creating session:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        Alert.alert('Error', data.error);
      } else {
        setMessages(prev => [...prev, {
          id: data.id,
          role: 'assistant',
          content: data.content,
          timestamp: data.timestamp,
        }]);
        loadSessions(); // Refresh sessions to get updated title
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      paddingTop: Platform.OS === 'android' ? 40 : 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },
    headerTitle: {
      fontSize: fontSize.header,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
      marginLeft: 12,
    },
    headerBtn: {
      padding: 8,
    },
    messagesContainer: {
      flex: 1,
      padding: 16,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: fontSize.header,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: fontSize.body,
      color: theme.textLight,
      textAlign: 'center',
      lineHeight: 24,
    },
    messageRow: {
      marginBottom: 16,
      maxWidth: '85%',
    },
    userMessageRow: {
      alignSelf: 'flex-end',
    },
    assistantMessageRow: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      padding: 14,
      borderRadius: 18,
    },
    userBubble: {
      backgroundColor: theme.primary,
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      backgroundColor: theme.card,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    messageText: {
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.5,
    },
    userText: {
      color: '#FFF',
    },
    assistantText: {
      color: theme.text,
    },
    messageTime: {
      fontSize: fontSize.small,
      color: theme.textLight,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    loadingBubble: {
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    loadingText: {
      fontSize: fontSize.body,
      color: theme.textLight,
      marginLeft: 10,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.background,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
      fontSize: fontSize.body,
      color: theme.text,
      maxHeight: 120,
      marginRight: 10,
    },
    sendBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: theme.border,
    },
    // Sessions sidebar
    sessionsOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 100,
    },
    sessionsSidebar: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: '80%',
      maxWidth: 320,
      backgroundColor: theme.card,
      zIndex: 101,
      paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    sessionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sessionsTitle: {
      fontSize: fontSize.header,
      fontWeight: '600',
      color: theme.text,
    },
    newChatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    newChatText: {
      color: '#FFF',
      fontWeight: '600',
      marginLeft: 6,
      fontSize: fontSize.label,
    },
    sessionsList: {
      flex: 1,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sessionItemActive: {
      backgroundColor: theme.primary + '20',
    },
    sessionIcon: {
      marginRight: 12,
    },
    sessionContent: {
      flex: 1,
    },
    sessionTitle: {
      fontSize: fontSize.body,
      fontWeight: '500',
      color: theme.text,
    },
    sessionDate: {
      fontSize: fontSize.small,
      color: theme.textLight,
      marginTop: 2,
    },
    deleteSessionBtn: {
      padding: 8,
    },
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSessions(true)}>
            <Ionicons name="menu" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sessions.find(s => s.id === currentSession)?.title || 'AI Assistant'}
          </Text>
          <TouchableOpacity style={styles.headerBtn} onPress={createNewSession}>
            <Ionicons name="add-circle-outline" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={80}
                color={theme.border}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>Hello! I'm your assistant</Text>
              <Text style={styles.emptyText}>
                Ask me anything! I can help with questions, give advice, or just chat with you.
              </Text>
            </View>
          ) : (
            <>
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    message.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        message.role === 'user' ? styles.userText : styles.assistantText,
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                  <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
                </View>
              ))}
              {isLoading && (
                <View style={styles.loadingBubble}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={theme.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Sessions Sidebar */}
      {showSessions && (
        <>
          <TouchableOpacity
            style={styles.sessionsOverlay}
            activeOpacity={1}
            onPress={() => setShowSessions(false)}
          />
          <View style={styles.sessionsSidebar}>
            <SafeAreaView edges={['top']}>
              <View style={styles.sessionsHeader}>
                <Text style={styles.sessionsTitle}>Chats</Text>
                <TouchableOpacity style={styles.newChatBtn} onPress={createNewSession}>
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.newChatText}>New</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
            <ScrollView style={styles.sessionsList}>
              {sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.sessionItem,
                    currentSession === session.id && styles.sessionItemActive,
                  ]}
                  onPress={() => {
                    setCurrentSession(session.id);
                    setShowSessions(false);
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={22}
                    color={currentSession === session.id ? theme.primary : theme.textLight}
                    style={styles.sessionIcon}
                  />
                  <View style={styles.sessionContent}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <Text style={styles.sessionDate}>{formatDate(session.created_at)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteSessionBtn}
                    onPress={() => deleteSession(session.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.warning} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              {sessions.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.textLight, fontSize: fontSize.body }}>
                    No conversations yet
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
