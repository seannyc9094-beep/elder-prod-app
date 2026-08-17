import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  publishedISO?: string;
  description?: string;
  source: string;
}

const API = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

const NEWS_SOURCES = [
  { name: 'CBC News', icon: 'globe' },
  { name: 'CBC Canada', icon: 'flag' },
  { name: 'Global News', icon: 'newspaper' },
  { name: 'CBC Health', icon: 'medkit' },
];

export default function News() {
  const { theme } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseRSSDate = (item: NewsItem): Date => {
    try {
      return new Date(item.publishedISO || item.pubDate);
    } catch {
      return new Date();
    }
  };

  const fetchNews = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API}/news`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items: NewsItem[] = data.items || [];
      setNews(items);
      if (items.length === 0) {
        setError('Unable to load news. Please check your internet connection.');
      }
    } catch (e) {
      console.error('Error fetching news:', e);
      setError('Unable to load news. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const filteredNews = selectedSource
    ? news.filter(n => n.source === selectedSource)
    : news;

  const formatDate = (item: NewsItem): string => {
    try {
      const date = parseRSSDate(item);
      if (isNaN(date.getTime())) return '';
      return format(date, 'MMM d, h:mm a');
    } catch {
      return '';
    }
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
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textLight,
      marginTop: 4,
    },
    sourceFilter: {
      maxHeight: 60,
      paddingLeft: 16,
    },
    sourceFilterContent: {
      paddingRight: 16,
      alignItems: 'center',
    },
    sourceChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 10,
    },
    sourceChipActive: {
      backgroundColor: theme.primary,
    },
    sourceChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 6,
    },
    sourceChipTextActive: {
      color: '#FFF',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.textLight,
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    errorText: {
      fontSize: 18,
      color: theme.textLight,
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 24,
    },
    retryBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 25,
    },
    retryBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFF',
    },
    newsList: {
      flex: 1,
      padding: 16,
    },
    newsCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    newsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sourceBadge: {
      backgroundColor: theme.secondary + '30',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    sourceText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.secondary,
    },
    newsDate: {
      fontSize: 12,
      color: theme.textLight,
    },
    newsTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 28,
      marginBottom: 8,
    },
    newsDescription: {
      fontSize: 15,
      color: theme.textLight,
      lineHeight: 22,
      marginBottom: 12,
    },
    readMore: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    readMoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
      marginRight: 4,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>News Feed</Text>
        <Text style={styles.subtitle}>Stay informed</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sourceFilter}
        contentContainerStyle={styles.sourceFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.sourceChip,
            !selectedSource && styles.sourceChipActive,
          ]}
          onPress={() => setSelectedSource(null)}
        >
          <Ionicons name="apps" size={18} color={!selectedSource ? '#FFF' : theme.text} />
          <Text style={[styles.sourceChipText, !selectedSource && styles.sourceChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {NEWS_SOURCES.map(feed => (
          <TouchableOpacity
            key={feed.name}
            style={[
              styles.sourceChip,
              selectedSource === feed.name && styles.sourceChipActive,
            ]}
            onPress={() => setSelectedSource(selectedSource === feed.name ? null : feed.name)}
          >
            <Ionicons
              name={feed.icon as any}
              size={18}
              color={selectedSource === feed.name ? '#FFF' : theme.text}
            />
            <Text style={[
              styles.sourceChipText,
              selectedSource === feed.name && styles.sourceChipTextActive,
            ]}>
              {feed.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={60} color={theme.border} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchNews}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.newsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {filteredNews.map((item, index) => (
            <TouchableOpacity
              key={`${item.link}-${index}`}
              style={styles.newsCard}
              onPress={() => openLink(item.link)}
              activeOpacity={0.7}
            >
              <View style={styles.newsHeader}>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceText}>{item.source}</Text>
                </View>
                <Text style={styles.newsDate}>{formatDate(item)}</Text>
              </View>
              <Text style={styles.newsTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.newsDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.readMore}>
                <Text style={styles.readMoreText}>Read full article</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.primary} />
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
