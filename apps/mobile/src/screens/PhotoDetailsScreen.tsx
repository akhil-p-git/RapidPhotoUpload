import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Share,
  Platform,
  Image,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { PhotoResponse, GalleryApi, formatFileSize, formatDateTime, API_BASE_URL } from '@rapidphoto/shared';
import { authService } from '../services/authService';

const { width, height } = Dimensions.get('window');

type PhotoDetailsRouteParams = {
  photo: PhotoResponse;
  photos?: PhotoResponse[];
  currentIndex?: number;
};

export const PhotoDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: PhotoDetailsRouteParams }, 'params'>>();
  const { photo, photos = [], currentIndex = 0 } = route.params || {};

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(currentIndex);

  const galleryApi = new GalleryApi(authService.getApiClient().instance);
  const currentPhoto = photos[currentPhotoIndex] || photo;

  const handlePrevious = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const handleDownload = async () => {
    try {
      const apiClient = authService.getApiClient();
      const baseUrl = apiClient.instance.defaults.baseURL || 'http://localhost:8080/api';
      const imageUrl = `${baseUrl}/photos/${currentPhoto.id}/file?size=original`;
      
      // In a real app, you'd use a library like react-native-fs to download
      Alert.alert('Download', 'Photo download functionality would be implemented here');
    } catch (error) {
      Alert.alert('Error', 'Failed to download photo');
    }
  };

  const handleShare = async () => {
    try {
      const apiClient = authService.getApiClient();
      const baseUrl = apiClient.instance.defaults.baseURL || 'http://localhost:8080/api';
      const imageUrl = `${baseUrl}/photos/${currentPhoto.id}/file?size=original`;
      
      await Share.share({
        message: `Check out this photo: ${currentPhoto.originalFileName}`,
        url: imageUrl,
        title: currentPhoto.originalFileName,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share photo');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await galleryApi.deletePhoto(currentPhoto.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const imageUrl = `${API_BASE_URL}/photos/${currentPhoto.id}/file?size=large`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentPhoto.originalFileName}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Viewer */}
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            {currentPhotoIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={handlePrevious}
              >
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
            )}
            {currentPhotoIndex < photos.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={handleNext}
              >
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Metadata Panel */}
      <ScrollView style={styles.metadataContainer}>
        <View style={styles.metadataSection}>
          <Text style={styles.metadataLabel}>File Name</Text>
          <Text style={styles.metadataValue}>{currentPhoto.originalFileName}</Text>
        </View>

        <View style={styles.metadataSection}>
          <Text style={styles.metadataLabel}>File Size</Text>
          <Text style={styles.metadataValue}>{formatFileSize(currentPhoto.fileSizeBytes)}</Text>
        </View>

        {currentPhoto.width && currentPhoto.height && (
          <View style={styles.metadataSection}>
            <Text style={styles.metadataLabel}>Dimensions</Text>
            <Text style={styles.metadataValue}>
              {currentPhoto.width} × {currentPhoto.height} px
            </Text>
          </View>
        )}

        <View style={styles.metadataSection}>
          <Text style={styles.metadataLabel}>Uploaded At</Text>
          <Text style={styles.metadataValue}>{formatDateTime(currentPhoto.uploadedAt)}</Text>
        </View>

        {currentPhoto.processedAt && (
          <View style={styles.metadataSection}>
            <Text style={styles.metadataLabel}>Processed At</Text>
            <Text style={styles.metadataValue}>{formatDateTime(currentPhoto.processedAt)}</Text>
          </View>
        )}

        {currentPhoto.exifData && Object.keys(currentPhoto.exifData).length > 0 && (
          <View style={styles.metadataSection}>
            <Text style={styles.metadataLabel}>EXIF Data</Text>
            {Object.entries(currentPhoto.exifData).slice(0, 5).map(([key, value]) => (
              <Text key={key} style={styles.metadataValue}>
                {key}: {String(value)}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
            <Text style={styles.actionButtonText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: width,
    height: height * 0.6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  metadataContainer: {
    maxHeight: height * 0.3,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  metadataSection: {
    marginBottom: 16,
  },
  metadataLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  metadataValue: {
    color: '#fff',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#fff',
  },
});

