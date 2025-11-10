import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { authService } from '../services/authService';
import { GalleryApi, PhotoStats } from '@rapidphoto/shared';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen: React.FC = () => {
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [autoUpload, setAutoUpload] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [uploadQuality, setUploadQuality] = useState<'original' | 'compressed'>('compressed');
  const navigation = useNavigation();
  const galleryApi = new GalleryApi(authService.getApiClient().instance);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await galleryApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.navigate('Login' as never);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        {stats && (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Photos:</Text>
              <Text style={styles.statValue}>{stats.totalPhotos}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Storage Used:</Text>
              <Text style={styles.statValue}>
                {(stats.storageUsedBytes / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Storage Quota:</Text>
              <Text style={styles.statValue}>
                {(stats.storageQuotaBytes / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${stats.storageUsedPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stats.storageUsedPercent.toFixed(1)}% used
            </Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto Upload</Text>
          <Switch value={autoUpload} onValueChange={setAutoUpload} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>WiFi Only</Text>
          <Switch value={wifiOnly} onValueChange={setWifiOnly} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Upload Quality</Text>
          <View style={styles.qualityButtons}>
            <TouchableOpacity
              style={[
                styles.qualityButton,
                uploadQuality === 'original' && styles.qualityButtonActive,
              ]}
              onPress={() => setUploadQuality('original')}
            >
              <Text
                style={[
                  styles.qualityButtonText,
                  uploadQuality === 'original' && styles.qualityButtonTextActive,
                ]}
              >
                Original
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.qualityButton,
                uploadQuality === 'compressed' && styles.qualityButtonActive,
              ]}
              onPress={() => setUploadQuality('compressed')}
            >
              <Text
                style={[
                  styles.qualityButtonText,
                  uploadQuality === 'compressed' && styles.qualityButtonTextActive,
                ]}
              >
                Compressed
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
  },
  qualityButtons: {
    flexDirection: 'row',
  },
  qualityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginLeft: 8,
  },
  qualityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  qualityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  qualityButtonTextActive: {
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

