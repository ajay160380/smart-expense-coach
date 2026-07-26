import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/config';
import { COLORS, CAT_COLORS, CAT_ICONS, SPACING, getFallbackIcon } from '../utils/theme';
import { GlassCard, EmptyState, AnimatedNumber } from '../components/SharedComponents';

export default function HistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    try {
      const res = await api.get(`/transactions-history/?month=${month}&year=${year}`);
      setData(res.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const changeMonth = (offset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const exportData = async (format) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      Alert.alert('Exporting', `Preparing your ${format.toUpperCase()} export for ${data?.month || 'this month'}...`);
      const url = `${api.defaults.baseURL}/api/export/${format}/?month=${month}&year=${year}`;
      const tokenStr = await AsyncStorage.getItem('userToken');
      const token = tokenStr ? `Token ${tokenStr}` : '';
      
      const fileUri = FileSystem.cacheDirectory + `ExpenseTracker_${data?.month?.replace(' ', '_') || 'History'}.${format}`;
      
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: token }
      });
      
      if (downloadRes.status === 200) {
        const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
        const uti = format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text';
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: mimeType,
          dialogTitle: `Download Expense ${format.toUpperCase()}`,
          UTI: uti
        });
      } else {
        Alert.alert('Error', 'Failed to download file');
      }
    } catch (e) {
      console.log('Export Error', e);
      Alert.alert('Export Failed', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.cyan} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{data?.month || currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.cyan} />
        </TouchableOpacity>
      </View>

      {/* Total Spent summary */}
      {!loading && data && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total Spent in {data.month}</Text>
          <Text style={styles.summaryAmount}>₹{Math.round(data.total_spent || 0).toLocaleString('en-IN')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 15 }}>
            <TouchableOpacity onPress={() => exportData('pdf')} style={{ marginRight: 20 }}>
              <Text style={{ color: COLORS.red, fontWeight: 'bold' }}>📄 Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => exportData('csv')}>
              <Text style={{ color: COLORS.cyan, fontWeight: 'bold' }}>📊 Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Transactions List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={COLORS.cyan} size="large" style={{ marginTop: 50 }} />
        ) : (
          <>
            {data?.transactions?.length > 0 ? (
              <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
                {data.transactions.map((exp, idx) => (
                  <TouchableOpacity 
                    key={exp.id || idx} 
                    style={[styles.expenseItem, idx < data.transactions.length - 1 && styles.expenseBorder]}
                    onPress={() => navigation.navigate('AddExpense', { expense: exp })}
                  >
                    <View style={[styles.expIcon, { backgroundColor: (CAT_COLORS[exp.category] || '#888') + '22' }]}>
                      <Text style={{ fontSize: 18 }}>{CAT_ICONS[exp.category] || getFallbackIcon(exp.category)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expCategory} numberOfLines={1}>
                        {exp.description 
                          ? exp.description.charAt(0).toUpperCase() + exp.description.slice(1) 
                          : (exp.category || 'other').charAt(0).toUpperCase() + (exp.category || 'other').slice(1)}
                      </Text>
                      <Text style={styles.expDate}>{formatDate(exp.date)}</Text>
                    </View>
                    <Text style={[styles.expAmount, { marginRight: 10 }]}>-₹{Number(exp.amount).toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                ))}
              </GlassCard>
            ) : (
              <EmptyState
                icon="📅"
                title="No transactions"
                message={`You didn't record any expenses in ${data?.month || 'this month'}.`}
              />
            )}
          </>
        )}
      </ScrollView>
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
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    color: '#fff', fontSize: 18, fontWeight: 'bold',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  monthBtn: {
    padding: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 12,
  },
  monthText: {
    color: '#fff', fontSize: 16, fontWeight: '600',
  },
  summaryBox: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  summaryLabel: {
    color: COLORS.textSecondary, fontSize: 13, marginBottom: 5,
  },
  summaryAmount: {
    color: COLORS.red, fontSize: 24, fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  expenseBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  expIcon: {
    width: 40, height: 40,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  expCategory: {
    color: COLORS.textPrimary, fontSize: 15, fontWeight: '600',
  },
  expDate: {
    color: COLORS.textSecondary, fontSize: 12, marginTop: 4,
  },
  expAmount: {
    color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold',
  },
});
