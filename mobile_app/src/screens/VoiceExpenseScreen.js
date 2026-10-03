/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — NATIVE VOICE EXPENSE SCREEN
 * Push-to-Talk using expo-audio + PanResponder
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, 
  KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, 
  Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, 
  SectionList, DeviceEventEmitter, RefreshControl, Linking, LayoutAnimation, 
  UIManager, PanResponder, StatusBar as RNStatusBar 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, SHADOW } from '../utils/theme';
import { BASE_URL } from '../api/config';

export default function VoiceExpenseScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  let recorder = null;
  try {
    recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  } catch (e) {
    console.log('AudioRecorder init error:', e);
  }

  const isPrepared = useRef(false);
  const isRecordingRef = useRef(false);

  const startRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'Microphone access is required to record voice expenses.');
        return;
      }
      if (recorder) {
        await recorder.prepareToRecordAsync();
        recorder.record();
        isRecordingRef.current = true;
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording Notice', 'Microphone recording could not start: ' + err.message);
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (recorder) {
        await recorder.stop();
        await new Promise(r => setTimeout(r, 400));
        const uri = recorder.uri;
        if (uri) {
          await uploadAudio(uri);
        } else {
          throw new Error('No audio recorded');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Notice', 'Could not process audio. Please try speaking again.');
      setLoading(false);
    }
  };

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
        Alert.alert('Notice', data.error || data.message || 'Please speak your expense with the amount (e.g. 500 petrol).');
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
          {isRecording ? 'Listening...' : loading ? 'Processing your expense...' : 'Hold the microphone and speak your expense.'}
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
            <Pressable
              onPressIn={startRecording}
              onPressOut={stopRecording}
              style={({ pressed }) => [
                styles.micButton,
                (pressed || isRecording) && styles.micButtonRecording
              ]}
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
            </Pressable>
          )}
        </View>
        
        {isRecording ? (
          <Text style={styles.stopText}>🔴 Release to send</Text>
        ) : (
          <Text style={styles.stopText}>Hold to speak • Release to send</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg, 
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0 
  },

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
