/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — NATIVE VOICE EXPENSE SCREEN
 * Push-to-Talk using expo-audio + PanResponder
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Platform, ActivityIndicator, Alert,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, SHADOW } from '../utils/theme';
import { BASE_URL } from '../api/config';

export default function VoiceExpenseScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isPrepared = useRef(false);
  const isRecordingRef = useRef(false); // ref for PanResponder closure

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'Microphone access is required.');
        return;
      }
      if (!isPrepared.current) {
        await recorder.prepareToRecordAsync();
        isPrepared.current = true;
      }
      recorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setLoading(true);
    try {
      await recorder.stop();
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

  // PanResponder: start on finger down, stop on finger up (even if finger moves)
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { startRecording(); },
    onPanResponderRelease: () => { stopRecording(); },
    onPanResponderTerminate: () => { stopRecording(); }, // e.g. notification pulls focus away
  }), []);

  const uploadAudio = async (uri) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await FileSystem.uploadAsync(
        `${BASE_URL}/api/voice-expense/`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: 1, // MULTIPART
          fieldName: 'audio',
          mimeType: 'audio/m4a',
          headers: {
            'Authorization': `Token ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      const data = JSON.parse(response.body);

      if (response.status === 200 && data.status === 'success') {
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
          {isRecording ? 'Listening...' : loading ? 'Processing your expense...' : 'Tap the microphone and speak your expense.'}
        </Text>
        
        <Text style={styles.subInstructionText}>
          {!isRecording && !loading && 'e.g., "500 petrol" or "200 ki chai"'}
        </Text>

        <View style={styles.micContainer}>
          {loading ? (
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          ) : (
            <View
              {...panResponder.panHandlers}
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
            >
              <LinearGradient 
                colors={isRecording ? ['#ef4444', '#dc2626'] : COLORS.gradOrange} 
                style={styles.micGradient}
              >
                <MaterialCommunityIcons 
                  name={isRecording ? "microphone" : "microphone-outline"} 
                  size={56} 
                  color="#fff" 
                />
              </LinearGradient>
            </View>
          )}
        </View>
        
        {isRecording ? (
          <Text style={styles.stopText}>🔴 Release to stop</Text>
        ) : (
          <Text style={styles.stopText}>Hold to speak</Text>
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
    height: 24,
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
