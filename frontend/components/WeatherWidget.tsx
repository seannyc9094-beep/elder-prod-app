import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
}

interface CityData {
  name: string;
  lat: number;
  lon: number;
}

// Default city (Toronto)
const DEFAULT_CITY: CityData = {
  name: 'Toronto, ON',
  lat: 43.6532,
  lon: -79.3832,
};

const getWeatherIcon = (code: number, isDay: boolean): string => {
  // WMO Weather interpretation codes
  if (code === 0) return isDay ? 'sunny' : 'moon';
  if (code === 1 || code === 2) return isDay ? 'partly-sunny' : 'cloudy-night';
  if (code === 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'cloudy'; // Fog
  if (code >= 51 && code <= 55) return 'rainy'; // Drizzle
  if (code >= 56 && code <= 57) return 'snow'; // Freezing drizzle
  if (code >= 61 && code <= 65) return 'rainy'; // Rain
  if (code >= 66 && code <= 67) return 'snow'; // Freezing rain
  if (code >= 71 && code <= 77) return 'snow'; // Snow
  if (code >= 80 && code <= 82) return 'rainy'; // Rain showers
  if (code >= 85 && code <= 86) return 'snow'; // Snow showers
  if (code >= 95) return 'thunderstorm'; // Thunderstorm
  return 'cloudy';
};

const getWeatherDescription = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing drizzle';
  if (code >= 61 && code <= 65) return 'Rainy';
  if (code >= 66 && code <= 67) return 'Freezing rain';
  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};

export default function WeatherWidget() {
  const { theme } = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState<CityData>(DEFAULT_CITY);

  const loadCity = async () => {
    try {
      const saved = await AsyncStorage.getItem('weather_city');
      if (saved) {
        const cityData = JSON.parse(saved);
        setCity(cityData);
        return cityData;
      }
      return DEFAULT_CITY;
    } catch (e) {
      console.error('Error loading city:', e);
      return DEFAULT_CITY;
    }
  };

  const fetchWeather = async (cityData?: CityData) => {
    setLoading(true);
    setError(null);
    
    try {
      const targetCity = cityData || city;
      
      // Fetch weather from Open-Meteo (Celsius)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${targetCity.lat}&longitude=${targetCity.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&temperature_unit=celsius&wind_speed_unit=kmh`
      );

      if (!response.ok) throw new Error('Weather fetch failed');

      const data = await response.json();
      
      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        weatherCode: data.current.weather_code,
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        isDay: data.current.is_day === 1,
      });
      setError(null);
    } catch (e) {
      console.error('Weather fetch error:', e);
      setError('Unable to load weather');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const cityData = await loadCity();
      await fetchWeather(cityData);
    };
    init();
  }, []);

  // Listen for city changes
  useEffect(() => {
    const checkForCityChange = async () => {
      const saved = await AsyncStorage.getItem('weather_city');
      if (saved) {
        const cityData = JSON.parse(saved);
        if (cityData.name !== city.name) {
          setCity(cityData);
          fetchWeather(cityData);
        }
      }
    };

    // Check every 2 seconds for city changes (when returning from settings)
    const interval = setInterval(checkForCityChange, 2000);
    return () => clearInterval(interval);
  }, [city.name]);

  const handleRefresh = () => {
    fetchWeather();
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    errorContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    errorText: {
      fontSize: 14,
      color: theme.textLight,
      marginBottom: 12,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
    },
    retryText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    location: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    refreshBtn: {
      padding: 4,
    },
    mainContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tempContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    temperature: {
      fontSize: 56,
      fontWeight: '300',
      color: theme.text,
    },
    tempUnit: {
      fontSize: 24,
      fontWeight: '400',
      color: theme.textLight,
      marginTop: 8,
    },
    weatherInfo: {
      alignItems: 'flex-end',
    },
    weatherIcon: {
      marginBottom: 4,
    },
    weatherDesc: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 8,
    },
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    detailText: {
      fontSize: 14,
      color: theme.textLight,
      marginLeft: 4,
    },
    settingsHint: {
      fontSize: 12,
      color: theme.textLight,
      textAlign: 'center',
      marginTop: 12,
      fontStyle: 'italic',
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.errorText, { marginTop: 8, marginBottom: 0 }]}>Getting weather...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={40} color={theme.textLight} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!weather) return null;

  const iconName = getWeatherIcon(weather.weatherCode, weather.isDay);
  const description = getWeatherDescription(weather.weatherCode);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={styles.location}>{city.name}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <Ionicons name="refresh" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.mainContent}>
        <View style={styles.tempContainer}>
          <Text style={styles.temperature}>{weather.temperature}</Text>
          <Text style={styles.tempUnit}>°C</Text>
        </View>
        <View style={styles.weatherInfo}>
          <Ionicons
            name={iconName as any}
            size={48}
            color={theme.primary}
            style={styles.weatherIcon}
          />
          <Text style={styles.weatherDesc}>{description}</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="water" size={16} color={theme.textLight} />
              <Text style={styles.detailText}>{weather.humidity}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="speedometer" size={16} color={theme.textLight} />
              <Text style={styles.detailText}>{weather.windSpeed} km/h</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={styles.settingsHint}>Change city in Settings</Text>
    </View>
  );
}
