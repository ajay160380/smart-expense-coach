/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — PRIVACY POLICY SCREEN (ITEM 16)
 * Complete, transparent financial data privacy disclosure
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#CBD5E1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={28} color="#10B981" />
          </View>
          <Text style={styles.heroTitle}>Your Financial Privacy Matters</Text>
          <Text style={styles.lastUpdated}>Last updated: October 2026</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>1. Information We Collect</Text>
          <Text style={styles.bodyText}>
            When you register and use Paisa Mitra, we collect:
            {'\n'}• Account identifiers: username, phone number, and optional email address.
            {'\n'}• Transaction logs: amounts, categories, timestamps, notes, and optional location tags.
            {'\n'}• Savings goals, budget targets, and recurring subscription reminders.
            {'\n'}• Device telemetry and crash reports strictly for service reliability.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>2. How Your Financial Data Is Used</Text>
          <Text style={styles.bodyText}>
            We process your financial entries strictly to deliver personal finance insights:
            {'\n'}• Calculating monthly budgets, category breakdowns, and spending streaks.
            {'\n'}• Delivering AI habit analysis and smart warnings via our secure backend.
            {'\n'}• Syncing split expenses between members of groups you create.
            {'\n\n'}We NEVER sell, rent, or trade your personal or financial data to advertisers or third-party loan brokers.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>3. Data Security & Storage</Text>
          <Text style={styles.bodyText}>
            • All network transmissions are strictly encrypted via TLS 1.3 / HTTPS.
            {'\n'}• Passwords are cryptographically hashed using PBKDF2 with SHA-256 salts.
            {'\n'}• Row-level access controls ensure no other user can access or view your ledgers.
            {'\n'}• Automated snapshots are secured with gzip compression and restricted access.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>4. Your Rights & Account Deletion</Text>
          <Text style={styles.bodyText}>
            You retain full ownership of your data at all times:
            {'\n'}• You can export your entire transaction history to CSV from the Dashboard or History screen.
            {'\n'}• You can permanently delete your account and all associated transactions at any time directly in Profile Settings. Deletion is instantaneous and permanent.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>5. Contact Our Privacy Team</Text>
          <Text style={styles.bodyText}>
            If you have questions, data inquiries, or security disclosures, please reach out via the in-app Feedback tool or email privacy@paisamitra.com.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  content: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  shieldBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A888FF',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
});
