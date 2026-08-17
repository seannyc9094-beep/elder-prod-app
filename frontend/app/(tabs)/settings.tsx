import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useFontSize, FontSizeOption } from '../../context/FontSizeContext';
import { useAuth } from '../../context/AuthContext';

// Popular Canadian cities with coordinates
const POPULAR_CITIES = [
  { name: 'Toronto, ON', lat: 43.6532, lon: -79.3832 },
  { name: 'Montreal, QC', lat: 45.5017, lon: -73.5673 },
  { name: 'Vancouver, BC', lat: 49.2827, lon: -123.1207 },
  { name: 'Calgary, AB', lat: 51.0447, lon: -114.0719 },
  { name: 'Edmonton, AB', lat: 53.5461, lon: -113.4938 },
  { name: 'Ottawa, ON', lat: 45.4215, lon: -75.6972 },
  { name: 'Winnipeg, MB', lat: 49.8951, lon: -97.1384 },
  { name: 'Quebec City, QC', lat: 46.8139, lon: -71.2080 },
  { name: 'Hamilton, ON', lat: 43.2557, lon: -79.8711 },
  { name: 'Halifax, NS', lat: 44.6488, lon: -63.5752 },
  { name: 'Victoria, BC', lat: 48.4284, lon: -123.3656 },
  { name: 'London, ON', lat: 42.9849, lon: -81.2453 },
  { name: 'Saskatoon, SK', lat: 52.1332, lon: -106.6700 },
  { name: 'Regina, SK', lat: 50.4452, lon: -104.6189 },
  { name: 'St. John\'s, NL', lat: 47.5615, lon: -52.7126 },
];

export default function Settings() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { fontSizeOption, fontSize, setFontSize } = useFontSize();
  const { user, logout } = useAuth();
  const [weatherCity, setWeatherCity] = useState<string>('Toronto, ON');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWeatherCity();
  }, []);

  const loadWeatherCity = async () => {
    try {
      const saved = await AsyncStorage.getItem('weather_city');
      if (saved) {
        const cityData = JSON.parse(saved);
        setWeatherCity(cityData.name);
      }
    } catch (e) {
      console.error('Error loading weather city:', e);
    }
  };

  const selectCity = async (city: typeof POPULAR_CITIES[0]) => {
    try {
      await AsyncStorage.setItem('weather_city', JSON.stringify(city));
      setWeatherCity(city.name);
      setShowCityPicker(false);
      setSearchQuery('');
    } catch (e) {
      console.error('Error saving weather city:', e);
    }
  };

  const filteredCities = POPULAR_CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      logout();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
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
    section: {
      marginTop: 20,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textLight,
      marginBottom: 12,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    settingRowLast: {
      borderBottomWidth: 0,
    },
    settingIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.text,
    },
    settingSubtitle: {
      fontSize: 14,
      color: theme.textLight,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    themePreview: {
      marginTop: 24,
      padding: 20,
      backgroundColor: theme.card,
      marginHorizontal: 16,
      borderRadius: 16,
    },
    themePreviewTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    colorRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    colorSwatch: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorLabel: {
      fontSize: 10,
      color: theme.textLight,
      marginTop: 6,
      textAlign: 'center',
    },
    aboutSection: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    appName: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginTop: 12,
    },
    version: {
      fontSize: 14,
      color: theme.textLight,
      marginTop: 4,
    },
    tagline: {
      fontSize: 14,
      color: theme.primary,
      marginTop: 8,
      fontStyle: 'italic',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    modalCloseBtn: {
      padding: 4,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      margin: 16,
      padding: 14,
      borderRadius: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      marginLeft: 10,
    },
    cityList: {
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    cityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.background,
      borderRadius: 12,
      marginBottom: 8,
    },
    cityItemSelected: {
      backgroundColor: theme.primary + '20',
      borderWidth: 2,
      borderColor: theme.primary,
    },
    cityName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    cityNameSelected: {
      color: theme.primary,
    },
    checkIcon: {
      marginLeft: 10,
    },
    fontSizeBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      marginHorizontal: 4,
      borderRadius: 12,
    },
    fontSizeBtnText: {
      fontWeight: '700',
    },
    fontSizeLabel: {
      fontSize: 10,
      marginTop: 4,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your experience</Text>
      </View>

      <ScrollView>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            {user ? (
              <>
                <View style={styles.settingRow}>
                  <View style={[styles.settingIcon, { backgroundColor: theme.secondary + '25' }]}>
                    <Ionicons name="person-circle" size={26} color={theme.secondary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{user.name}</Text>
                    <Text style={styles.settingSubtitle}>{user.email}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                </View>
                <TouchableOpacity
                  style={[styles.settingRow, styles.settingRowLast]}
                  onPress={handleSignOut}
                >
                  <View style={[styles.settingIcon, { backgroundColor: theme.clear + '20' }]}>
                    <Ionicons name="log-out-outline" size={24} color={theme.clear} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: theme.clear }]}>Sign Out</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => router.push('/auth/login')}
                >
                  <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="log-in-outline" size={24} color={theme.primary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Sign In</Text>
                    <Text style={styles.settingSubtitle}>Access your account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textLight} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingRow, styles.settingRowLast]}
                  onPress={() => router.push('/auth/register')}
                >
                  <View style={[styles.settingIcon, { backgroundColor: theme.secondary + '25' }]}>
                    <Ionicons name="person-add-outline" size={24} color={theme.secondary} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Create Account</Text>
                    <Text style={styles.settingSubtitle}>New here? Join in a minute</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textLight} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Weather Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={() => setShowCityPicker(true)}
            >
              <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="location" size={24} color={theme.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Weather City</Text>
                <Text style={styles.settingSubtitle}>Tap to change your city</Text>
              </View>
              <Text style={styles.settingValue}>{weatherCity}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textLight} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={[styles.settingIcon, { backgroundColor: isDark ? '#5A189A' : '#E8DDD4' }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={24}
                  color={isDark ? '#C77DFF' : '#E8A87C'}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingSubtitle}>
                  {isDark ? 'Deep purple theme active' : 'Light warm theme active'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={isDark ? '#C77DFF' : '#FFF'}
                ios_backgroundColor={theme.border}
              />
            </View>
          </View>
        </View>

        <View style={styles.themePreview}>
          <Text style={styles.themePreviewTitle}>
            {isDark ? 'Deep Purple Theme' : 'Warm Light Theme'}
          </Text>
          <View style={styles.colorRow}>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.primary }]} />
              <Text style={styles.colorLabel}>Primary</Text>
            </View>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.secondary }]} />
              <Text style={styles.colorLabel}>Secondary</Text>
            </View>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.accent }]} />
              <Text style={styles.colorLabel}>Accent</Text>
            </View>
            <View>
              <View style={[styles.colorSwatch, { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }]} />
              <Text style={styles.colorLabel}>Background</Text>
            </View>
          </View>
        </View>

        {/* Font Size Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Text Size</Text>
          <View style={styles.card}>
            <View style={[styles.settingRow, styles.settingRowLast, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="text" size={24} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Font Size</Text>
                  <Text style={styles.settingSubtitle}>Make text easier to read</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {(['small', 'medium', 'large', 'xlarge'] as FontSizeOption[]).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.fontSizeBtn,
                      { backgroundColor: fontSizeOption === size ? theme.primary : theme.background },
                    ]}
                    onPress={() => setFontSize(size)}
                  >
                    <Text
                      style={[
                        styles.fontSizeBtnText,
                        {
                          color: fontSizeOption === size ? '#FFF' : theme.text,
                          fontSize: size === 'small' ? 12 : size === 'medium' ? 14 : size === 'large' ? 16 : 18,
                        },
                      ]}
                    >
                      {size === 'small' ? 'S' : size === 'medium' ? 'M' : size === 'large' ? 'L' : 'XL'}
                    </Text>
                    <Text
                      style={[
                        styles.fontSizeLabel,
                        { color: fontSizeOption === size ? '#FFF' : theme.textLight },
                      ]}
                    >
                      {size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : size === 'large' ? 'Large' : 'Extra'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="information-circle" size={24} color={theme.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Senior Productivity App</Text>
                <Text style={styles.settingSubtitle}>Version 1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.aboutSection}>
          <Ionicons name="heart" size={40} color={theme.primary} />
          <Text style={styles.appName}>Made with care</Text>
          <Text style={styles.version}>For our beloved seniors</Text>
          <Text style={styles.tagline}>"Simple, Beautiful, Easy to Use"</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* City Picker Modal */}
      <Modal
        visible={showCityPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your City</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowCityPicker(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor={theme.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.cityList}>
              {filteredCities.map((city) => {
                const isSelected = city.name === weatherCity;
                return (
                  <TouchableOpacity
                    key={city.name}
                    style={[styles.cityItem, isSelected && styles.cityItemSelected]}
                    onPress={() => selectCity(city)}
                  >
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={isSelected ? theme.primary : theme.textLight}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                      {city.name}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={theme.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
