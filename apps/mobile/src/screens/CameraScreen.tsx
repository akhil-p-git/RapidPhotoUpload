import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '../services/uploadService';
import * as ImageManipulator from 'expo-image-manipulator';

export const CameraScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraKey, setCameraKey] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Reset camera when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setCameraKey(prev => prev + 1);
    }, [])
  );

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync();
      console.log('Picture taken:', photo);

      if (photo) {
        console.log('Compressing image...');
        // Compress image if needed
        const compressed = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 1920 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        console.log('Image compressed:', compressed);

        // Add to upload queue
        const fileName = `photo_${Date.now()}.jpg`;
        const taskId = await uploadService.addToQueue(compressed.uri, fileName);
        console.log('Added to queue:', taskId);

        // Start upload
        uploadService.upload(taskId).catch((error) => {
          console.error('Upload error:', error);
          Alert.alert('Upload Failed', error.message);
        });

        Alert.alert('Success', 'Photo added to upload queue');
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', error.message || 'Failed to take picture');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          if (asset.uri) {
            // Compress image if needed
            const compressed = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: 1920 } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            // Add to upload queue
            const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
            const taskId = await uploadService.addToQueue(compressed.uri, fileName);
            
            // Start upload
            uploadService.upload(taskId).catch((error) => {
              Alert.alert('Upload Failed', error.message);
            });
          }
        }
        Alert.alert('Success', `${result.assets.length} photo(s) added to upload queue`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick photos');
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.flipButtonText}>Flip</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]} 
            onPress={takePicture}
            disabled={isCapturing}
          >
            <View style={[styles.captureButtonInner, isCapturing && styles.captureButtonInnerDisabled]} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 20,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  galleryButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  galleryButtonText: {
    fontSize: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  flipButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInnerDisabled: {
    backgroundColor: '#666',
  },
});

