import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import api from '../api/config';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

export default function NotepadScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await api.get('/notes/');
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      Alert.alert('Notice', 'Please write something in your note before saving.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSaving(true);
      const response = await api.post('/notes/', {
        text: newNote.trim(),
      });

      if (response.data.status === 'success' || response.data.note) {
        setNewNote('');
        fetchNotes();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Note',
      'Are you sure you want to remove this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/notes/${id}/delete/`);
              if (response.data.status === 'success') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setNotes((prev) => prev.filter((n) => n.id !== id));
              } else {
                Alert.alert('Error', response.data.error || 'Failed to delete note');
              }
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const renderNote = ({ item }) => (
    <View style={styles.noteCard}>
      <Text style={styles.noteText}>{item.text}</Text>
      <View style={styles.noteFooter}>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.noteDate}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }) : 'Recent'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteNote(item.id)}
          style={styles.deleteButton}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color="#F43F5E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Personal Notepad</Text>
          <Text style={styles.headerSub}>Memos, plans & checklists</Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{notes.length} Notes</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Create Note Box ── */}
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Write a note, shopping list, or plan..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={newNote}
            onChangeText={setNewNote}
          />
          <View style={styles.inputActionsRow}>
            <Text style={styles.charCount}>{newNote.length} characters</Text>
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSaveNote}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7C3AED', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGrad}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="add" size={17} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.saveButtonText}>Save Note</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Notes List ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="document-text-outline" size={40} color="#7C3AED" />
            </View>
            <Text style={styles.emptyText}>No Notes Yet</Text>
            <Text style={styles.emptySubtext}>
              Keep reminders, planned purchases, or bill checklists here!
            </Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderNote}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#06B6D4"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  countBadgeText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Input Box ──
  inputCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    color: '#1F2937',
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  charCount: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── List & Items ──
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  noteText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 10,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  // ── Empty & Loading ──
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 10,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
});
