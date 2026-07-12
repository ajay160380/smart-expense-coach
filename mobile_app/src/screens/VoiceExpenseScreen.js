/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — NATIVE VOICE EXPENSE SCREEN
 * Speech-to-Text using expo-audio and Groq Whisper backend
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SHADOW } from '../utils/theme';
import { BASE_URL } from '../api/config';

export default function VoiceExpenseScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Use the new expo-audio hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
    })();
  }, []);

  const startRecording = async () => {
    if (!permissionGranted) {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'Microphone access is required.');
        return;
      }
      setPermissionGranted(true);
    }
    
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recorder.isRecording) return;
    setLoading(true);

    try {
      await recorder.stop();
      // Give a tiny delay for the file to be written
      await new Promise(r => setTimeout(r, 300));
      const uri = recorder.uri;
      
      if (uri) {
        await uploadAudio(uri);
      } else {
        throw new Error('No audio URI found after recording stopped');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to process audio.');
      setLoading(false);
    }
  };

  const uploadAudio = async (uri) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      // React Native fetch supports FormData with {uri, type, name} objects
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/mp4',
        name: 'expense_audio.mp4',
      });

      const response = await fetch(`${BASE_URL}/api/voice-expense/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Accept': 'application/json',
          // Do NOT manually set Content-Type for FormData — React Native sets it with boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        Alert.alert('✅ Success', data.message || 'Expense saved successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', data.error || data.message || 'Failed to categorize expense.');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Network Error', 'Failed to send audio to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleMicPress = () => {
    if (recorder.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Voice Mode</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Main Content ── */}
      <View style={styles.content}>
        <Text style={styles.instructionText}>
          {recorder.isRecording ? 'Listening...' : loading ? 'Processing your expense...' : 'Tap the microphone and speak your expense.'}
        </Text>
        
        <Text style={styles.subInstructionText}>
          {!recorder.isRecording && !loading && 'e.g., "500 petrol" or "200 ki chai"'}
        </Text>

        <View style={styles.micContainer}>
          {loading ? (
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          ) : (
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={handleMicPress}
              style={[styles.micButton, recorder.isRecording && styles.micButtonRecording]}
            >
              <LinearGradient 
                colors={recorder.isRecording ? ['#ef4444', '#dc2626'] : COLORS.gradOrange} 
                style={styles.micGradient}
              >
                <MaterialCommunityIcons 
                  name={recorder.isRecording ? "stop" : "microphone"} 
                  size={56} 
                  color="#fff" 
                />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        
        {recorder.isRecording && (
          <Text style={styles.stopText}>Tap again to stop</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? 30 : 0 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  instructionText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subInstructionText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 60,
    height: 24, // Fix height to prevent jumping
  },
  
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    ...SHADOW.lg,
  },
  micButtonRecording: {
    transform: [{ scale: 1.1 }],
    ...SHADOW.xl,
  },
  micGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  stopText: {
    marginTop: 30,
    color: COLORS.red,
    fontSize: 16,
    fontWeight: '600',
  }
});
