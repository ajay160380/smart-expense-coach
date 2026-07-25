import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../utils/theme';
import { StatusBar } from 'expo-status-bar';

export default function NotificationsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Empty State */}
      <View style={styles.emptyContainer}>
        <View style={styles.iconBox}>
          <Ionicons name="notifications-off-outline" size={60} color="#FF3B30" />
        </View>
        <Text style={styles.emptyTitle}>OTA Magic Successful! 🚀</Text>
        <Text style={styles.emptyDesc}>
          Aapki app me Hawa se (OTA) Update aagaya hai, bina Play Store ke!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 136, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
