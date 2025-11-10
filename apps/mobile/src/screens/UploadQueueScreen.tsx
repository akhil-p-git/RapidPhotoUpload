import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { uploadService, UploadTask } from '../services/uploadService';

export const UploadQueueScreen: React.FC = () => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  const loadTasks = () => {
    const allTasks = uploadService.getAllTasks();
    setTasks(allTasks);
  };

  const handlePause = (taskId: string) => {
    uploadService.pause(taskId);
    loadTasks();
  };

  const handleResume = async (taskId: string) => {
    await uploadService.resume(taskId);
    loadTasks();
  };

  const handleRemove = (taskId: string) => {
    uploadService.remove(taskId);
    loadTasks();
  };

  const renderTask = ({ item }: { item: UploadTask }) => (
    <View style={styles.taskItem}>
      <Text style={styles.fileName} numberOfLines={1}>
        {item.fileName}
      </Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${item.progress}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{item.progress}%</Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[styles.status, styles[`status${item.status}`]]}>
          {item.status.toUpperCase()}
        </Text>
        <View style={styles.actions}>
          {item.status === 'uploading' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePause(item.id)}
            >
              <Text style={styles.actionButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
          {item.status === 'paused' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleResume(item.id)}
            >
              <Text style={styles.actionButtonText}>Resume</Text>
            </TouchableOpacity>
          )}
          {item.status !== 'uploading' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleRemove(item.id)}
            >
              <Text style={styles.actionButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {item.error && (
        <Text style={styles.errorText}>{item.error}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={loadTasks}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No uploads in queue</Text>
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
  taskItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  statuspending: {
    color: '#FFA500',
  },
  statusuploading: {
    color: '#007AFF',
  },
  statuscompleted: {
    color: '#34C759',
  },
  statusfailed: {
    color: '#FF3B30',
  },
  statuspaused: {
    color: '#FFA500',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
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
  },
});

