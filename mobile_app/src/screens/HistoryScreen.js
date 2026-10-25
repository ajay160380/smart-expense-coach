/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — HISTORY SCREEN (EXPENSES LIST)
 * Target Design (Image 2 Screen 2): Clean Light Theme,
 * Grouped by "Today", "Yesterday" with pure white cards,
 * Colored rounded-square icons, orange active pill chips.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/config';
import { COLORS, CAT_COLORS, CAT_ICONS, RADIUS, SHADOW } from '../utils/theme';
import { EmptyState } from '../components/SharedComponents';

export default function HistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'food', label: 'Food' },
    { key: 'transport', label: 'Transport' },
    { key: 'shopping', label: 'Shopping' },
    { key: 'health', label: 'Health' },
    { key: 'entertainment', label: 'Fun' },
    { key: 'education', label: 'Education' },
    { key: 'utilities', label: 'Utilities' },
    { key: 'other', label: 'Other' },
  ];

  const fetchHistory = useCallback(async () => {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const cacheKey = `history_cache_${year}_${month}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
      } else {
        setLoading(true);
      }

      const res = await api.get(`/transactions-history/?month=${month}&year=${year}`);
      setData(res.data);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(res.data));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchHistory();
    const sub = DeviceEventEmitter.addListener('EXPENSE_UPDATED', () => {
      fetchHistory();
    });
    return () => sub.remove();
  }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const changeMonth = (offset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const formatItemTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return timeStr;
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
        headers: { Authorization: token },
      });

      if (downloadRes.status === 200) {
        const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
        const uti = format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text';
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: mimeType,
          dialogTitle: `Download Expense ${format.toUpperCase()}`,
          UTI: uti,
        });
      } else {
        Alert.alert('Error', 'Failed to download file');
      }
    } catch (e) {
      console.log('Export Error', e);
      Alert.alert('Export Failed', e.message);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter((exp) => {
      const matchesCategory =
        selectedCategory === 'all' || (exp.category || '').toLowerCase() === selectedCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (exp.description && exp.description.toLowerCase().includes(query)) ||
        (exp.category && exp.category.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [data?.transactions, selectedCategory, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredTransactions.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  }, [filteredTransactions]);

  // ── Group by "Today", "Yesterday", and Dates (Matching Image 2 Screen 2) ──
  const groupedTransactions = useMemo(() => {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    filteredTransactions.forEach((exp) => {
      const expDate = exp.date ? new Date(exp.date).toDateString() : '';
      let groupKey = 'Earlier';
      if (expDate === today) groupKey = 'Today';
      else if (expDate === yesterday) groupKey = 'Yesterday';
      else if (exp.date) {
        groupKey = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(exp);
    });

    return Object.entries(groups).map(([title, items]) => ({ title, items }));
  }, [filteredTransactions]);

  const isFiltering = selectedCategory !== 'all' || searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses List</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => exportData('pdf')}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Month Selector Card ── */}
        <View style={styles.monthSelectorCard}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
            <Ionicons name="chevron-back" size={18} color="#FF6B35" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.monthText}>
              {data?.month || currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
            {data && (
              <Text style={styles.monthTotalSub}>
                Total: ₹{Math.round(data.total_spent || 0).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
            <Ionicons name="chevron-forward" size={18} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search expenses, notes, categories..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Category Filter Chips (Active Orange #FF6B35, Inactive White) ── */}
        <View style={styles.filterRowWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {categories.map((c) => {
              const isSelected = selectedCategory === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(c.key);
                  }}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Filter Stats Info ── */}
        {isFiltering && (
          <View style={styles.filterStatsBar}>
            <Text style={styles.filterStatsText}>
              Showing {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'}
            </Text>
            <Text style={styles.filterStatsTotal}>
              Total: ₹{Math.round(filteredTotal).toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* ── Grouped Expenses by "Today", "Yesterday" ── */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
        ) : groupedTransactions.length > 0 ? (
          groupedTransactions.map((group, gIdx) => (
            <View key={gIdx} style={styles.groupSection}>
              {/* Group Section Header */}
              <View style={styles.groupHeaderRow}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.viewAllOrange}>View All &gt;</Text>
              </View>

              {/* White Card Container */}
              <View style={styles.whiteListCard}>
                {group.items.map((exp, idx) => {
                  const catKey = (exp.category || 'other').toLowerCase();
                  const catColor = CAT_COLORS[catKey] || '#7C3AED';
                  const catIcon = CAT_ICONS[catKey] || 'pricetag';

                  return (
                    <TouchableOpacity
                      key={exp.id || idx}
                      style={[
                        styles.expenseItem,
                        idx < group.items.length - 1 && styles.expenseBorder,
                      ]}
                      onPress={() => navigation.navigate('AddExpense', { expense: exp })}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          'Expense Actions',
                          `₹${Number(exp.amount).toLocaleString('en-IN')} - ${exp.description || exp.category}`,
                          [
                            { text: '✏️ Edit', onPress: () => navigation.navigate('AddExpense', { expense: exp }) },
                            {
                              text: '🗑️ Delete',
                              style: 'destructive',
                              onPress: () => {
                                Alert.alert(
                                  'Confirm Delete',
                                  `Delete ₹${Number(exp.amount).toLocaleString('en-IN')} expense?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          await api.post(`/delete-expense/${exp.id}/`);
                                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                          fetchHistory();
                                          DeviceEventEmitter.emit('EXPENSE_UPDATED');
                                        } catch (e) {
                                          Alert.alert('Error', 'Could not delete expense');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }
                            },
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }}
                      activeOpacity={0.75}
                    >
                      {/* Colored Rounded-Square Icon */}
                      <View style={[styles.catSquareIcon, { backgroundColor: catColor }]}>
                        <Ionicons name={catIcon} size={18} color="#FFFFFF" />
                      </View>

                      {/* Title + Time Below */}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.expTitle} numberOfLines={1}>
                          {exp.description
                            ? exp.description.charAt(0).toUpperCase() + exp.description.slice(1)
                            : catKey.charAt(0).toUpperCase() + catKey.slice(1)}
                        </Text>
                        <Text style={styles.expTime}>
                          {group.title === 'Today' || group.title === 'Yesterday'
                            ? `${group.title}, ${formatItemTime(exp.date)}`
                            : `${group.title}`}
                        </Text>
                      </View>

                      {/* Amount Bold on Right */}
                      <Text style={styles.expAmountBold}>
                        ₹{Number(exp.amount).toLocaleString('en-IN')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        ) : isFiltering ? (
          <EmptyState
            icon="🔍"
            title="No matching transactions"
            message="Try adjusting your search query or selecting a different category filter."
          />
        ) : (
          <EmptyState
            icon="📅"
            title="No transactions"
            message={`You didn't record any expenses in ${data?.month || 'this month'}.`}
            actionText="Add Expense"
            onAction={() => navigation.navigate('AddExpense')}
          />
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F7F7FB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  headerTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },

  // ── Month Selector Card ──
  monthSelectorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    ...SHADOW.sm,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
  },
  monthTotalSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  // ── Search ──
  searchWrapper: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  searchInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Category Filters ──
  filterRowWrapper: {
    marginBottom: 14,
  },
  filterScroll: {
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterChipText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Filter Stats Bar ──
  filterStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F3F9',
  },
  filterStatsText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  filterStatsTotal: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Grouped Sections ──
  groupSection: {
    marginBottom: 16,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupTitle: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
  },
  viewAllOrange: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── White Card Container ──
  whiteListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    ...SHADOW.card,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  expenseBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catSquareIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expTitle: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  expTime: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  expAmountBold: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
  },
});
