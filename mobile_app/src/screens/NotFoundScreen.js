/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — NOT FOUND / 404 SCREEN (ITEM 13)
 * Elegant fallback for invalid deep links or missing routes.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotFoundScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.glowCircle} />
        
        <View style={styles.iconBox}>
          <Ionicons name="compass-outline" size={54} color="#7C3AED" />
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>404 — SCREEN NOT FOUND</Text>
        </View>

        <Text style={styles.title}>Lost in the Financial Maze?</Text>
        <Text style={styles.subtitle}>
          The screen or link you were trying to access doesn&apos;t exist or was moved to another section.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('MainTabs')}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="home-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Return to Dashboard</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glowCircle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 280,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
