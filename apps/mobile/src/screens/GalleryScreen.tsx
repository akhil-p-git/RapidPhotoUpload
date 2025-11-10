import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { GalleryApi, PhotoResponse, formatFileSize, API_BASE_URL } from '@rapidphoto/shared';
import { authService } from '../services/authService';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 32) / 3;

export const GalleryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [photos, setPhotos] = useState<PhotoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [authToken, setAuthToken] = useState<string>('');
  
  const galleryApi = useMemo(() => {
    return new GalleryApi(authService.getApiClient().instance);
  }, []);

  useEffect(() => {
    authService.getToken().then(token => {
      if (token) setAuthToken(token);
    });
  }, []);

  const loadPhotos = async (pageNum: number = 0, append: boolean = false) => {
    setLoading(true);
    setError(null);
    setDebugInfo(`Loading page ${pageNum}...`);
    
    try {
      console.log('Loading photos, page:', pageNum);
      const response = await galleryApi.getPhotos(pageNum, 24);
      console.log('Photos response:', { total: response.totalElements, count: response.content?.length });
      console.log('First photo sample:', response.content?.[0]);
      
      setDebugInfo(`Loaded ${response.content?.length || 0} photos (total: ${response.totalElements})`);
      
      if (response.content && response.content.length > 0) {
        if (append) {
          setPhotos(prev => [...prev, ...response.content]);
        } else {
          setPhotos(response.content);
        }
        console.log('Photos state updated, count:', response.content.length);
      } else {
        setPhotos([]);
        console.log('No photos in response');
      }
      
      setPage(response.currentPage || 0);
      setHasMore(response.hasNext || false);
      setError(null);
    } catch (error: any) {
      console.error('Error loading photos:', error);
      console.error('Error details:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load photos';
      setError(`Error: ${errorMsg}`);
      setDebugInfo(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [hasLoaded, setHasLoaded] = React.useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      loadPhotos(0, false);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPhotos(0, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPhotos(page + 1, true);
    }
  };

  const handlePhotoPress = (photo: PhotoResponse) => {
    const index = photos.findIndex(p => p.id === photo.id);
    navigation.navigate('PhotoDetails' as never, {
      photo,
      photos,
      currentIndex: index >= 0 ? index : 0,
    } as never);
  };

  const renderPhoto = ({ item }: { item: PhotoResponse }) => {
    // Use original size since thumbnails aren't generated
    const imageUrl = `${API_BASE_URL}/photos/${item.id}/file?size=original`;
    console.log('Rendering photo:', item.id, 'URL:', imageUrl);
    
    return (
      <TouchableOpacity
        style={styles.photoItem}
        onPress={() => handlePhotoPress(item)}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.photo}
          resizeMode="cover"
          onError={(e) => console.error('Image load error:', item.id, e.nativeEvent.error)}
          onLoad={() => console.log('Image loaded:', item.id)}
        />
        <View style={styles.photoOverlay}>
          <Text style={styles.photoDebugText}>#{item.id.substring(0, 8)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {photos.length} Photos Loaded | {debugInfo}
        </Text>
      </View>
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && photos.length > 0 ? (
            <ActivityIndicator style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.debugText}>{debugInfo}</Text>
              </>
            ) : error ? (
              <>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => loadPhotos(0, false)} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No photos yet</Text>
                <Text style={styles.debugText}>{debugInfo}</Text>
                <TouchableOpacity onPress={() => loadPhotos(0, false)} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 10,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    padding: 8,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
  },
  photoDebugText: {
    color: '#fff',
    fontSize: 8,
    textAlign: 'center',
  },
  loader: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

