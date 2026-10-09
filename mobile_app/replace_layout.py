import re

with open('src/screens/AddExpenseScreen.js', 'r') as f:
    content = f.read()

# Find the start of the return statement
start_index = content.find('  return (\n    <SafeAreaView style={styles.container}>')

new_render = """  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── TOP HALF: MASSIVE DYNAMIC GLOWING BACKGROUND & AMOUNT ── */}
      <View style={[styles.topHalf, { backgroundColor: selectedCat.color + '10' }]}>
        <Animated.View style={{
          position: 'absolute',
          top: -100,
          left: -50,
          right: -50,
          height: 350,
          backgroundColor: selectedCat.color,
          opacity: 0.25,
          borderRadius: 300,
          transform: [{ scaleX: 1.5 }],
        }} />

        <SafeAreaView>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.replace('DashboardMain');
              }} 
              style={styles.backBtn}
            >
              <Ionicons name="close" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Expense</Text>
            <View style={{ width: 36 }} />
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.amountContainer}>
              <Text style={[styles.rupee, { color: selectedCat.color }]}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                value={amount}
                onChangeText={(v) => setAmount(sanitizeAmount(v))}
                keyboardType="numeric"
                autoFocus
                selectionColor={selectedCat.color}
              />
            </View>

            <View style={styles.presetRow}>
              {[50, 100, 200, 500, 1000].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.presetChip, { backgroundColor: selectedCat.color + '20' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const current = parseFloat(amount) || 0;
                    setAmount(String(current + val));
                  }}
                >
                  <Text style={[styles.presetText, { color: selectedCat.color }]}>+₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>

      {/* ── BOTTOM HALF: OVERLAPPING SHEET ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[styles.bottomSheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            
            {/* ── Category Horizontal Scroll ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryPill,
                      category === cat.key && { backgroundColor: cat.color + '20', borderColor: cat.color, borderWidth: 1.5 }
                    ]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <Text style={styles.catEmoji}>{cat.icon}</Text>
                    <Text style={[styles.catLabel, category === cat.key && { color: cat.color, fontWeight: 'bold' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ── Description ── */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TouchableOpacity onPress={handleTagLocation} disabled={locationLoading}>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 8 }} />
                  ) : (
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>📍 Tag Location</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { borderColor: selectedCat.color + '40', backgroundColor: selectedCat.color + '05' }]}
                placeholder="What did you buy?"
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={255}
                selectionColor={selectedCat.color}
              />
            </View>

            {/* ── Date ── */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>DATE</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity 
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpDate(TODAY); }}
                    style={[styles.dateChip, expDate === TODAY && { backgroundColor: selectedCat.color + '33', borderColor: selectedCat.color }]}
                  >
                    <Text style={[styles.dateChipText, expDate === TODAY && { color: selectedCat.color, fontWeight: '700' }]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const y = new Date(); y.setDate(y.getDate() - 1); setExpDate(y.toISOString().split('T')[0]);
                    }}
                    style={[styles.dateChip, expDate !== TODAY && { backgroundColor: selectedCat.color + '33', borderColor: selectedCat.color }]}
                  >
                    <Text style={[styles.dateChipText, expDate !== TODAY && { color: selectedCat.color, fontWeight: '700' }]}>Yesterday</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.input, { borderColor: selectedCat.color + '40', backgroundColor: selectedCat.color + '05' }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={expDate}
                onChangeText={setExpDate}
                selectionColor={selectedCat.color}
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Absolute Save Button ── */}
          <View style={styles.footer}>
            <GradientButton
              title="Save Expense"
              onPress={handleAddExpense}
              loading={loading}
              colors={[selectedCat.color, selectedCat.color + 'CC']}
              icon={selectedCat.icon}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topHalf: {
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    paddingBottom: 60,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  rupee: {
    fontSize: 48,
    fontWeight: '600',
    marginRight: 8,
    marginTop: 8,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontSize: 72,
    fontWeight: '800',
    minWidth: 150,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    position: 'relative',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  categoryScroll: {
    paddingRight: 24,
    gap: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
  },
  catEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dateChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  }
});
"""

with open('src/screens/AddExpenseScreen.js', 'w') as f:
    f.write(content[:start_index] + new_render)
