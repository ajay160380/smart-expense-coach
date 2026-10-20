/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — GOOGLE SIGN-IN BUTTON
 * Modern, branded "Continue with Google" button
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  title = 'Continue with Google',
  style,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={loading || disabled}
      style={[styles.button, (loading || disabled) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#EA4335" />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
          </View>
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  disabled: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
