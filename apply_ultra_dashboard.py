import re

file_path = "mobile_app/src/screens/DashboardScreen.js"
with open(file_path, "r") as f:
    content = f.read()

# Let's rebuild the UI components in DashboardScreen
# We'll replace the styles completely and modify the JSX structure slightly where needed.
# Since rewriting the entire file is huge, I will use targeted regex or replacements.

new_styles = """
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B14' },
  center: { justifyContent: 'center', alignItems: 'center' },

  // ── Navbar ──
  navbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  navIconBtn: {
    padding: 10, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F43F5E' },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5, borderColor: '#38BDF8', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#38BDF8', fontWeight: '900', fontSize: 18 },

  scrollContent: { padding: 20, paddingBottom: 120 },

  // ── Greeting ──
  greetingSection: { marginTop: 10, marginBottom: 25 },
  greetText: { color: '#F8FAFC', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  greetSub: { color: '#94A3B8', fontSize: 15, fontWeight: '600', marginTop: 6, letterSpacing: 0.5 },

  // ── Alert Banner ──
  alertBanner: { marginBottom: 20 },
  alertItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertIcon: { fontSize: 22, marginRight: 12 },
  alertText: { color: '#F8FAFC', fontSize: 13, flex: 1, lineHeight: 20, fontWeight: '500' },

  // ── WhatsApp ──
  waBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 20, padding: 18, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  waIconContainer: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  waTextContainer: { flex: 1 },
  waTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, marginBottom: 4 },
  waSubtitle: { color: '#A7F3D0', fontSize: 12, fontWeight: '500' },
  waButton: { backgroundColor: '#22C55E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25 },
  waButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // ── Main Card (Ultra Premium) ──
  mainCard: {
    borderRadius: 32, padding: 28, marginBottom: 25,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 35, elevation: 15,
  },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  mainCardTitle: { color: '#E2E8F0', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  overspentBadge: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' },
  overspentText: { color: '#FECACA', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  balanceContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  currencySymbol: { color: '#A78BFA', fontSize: 32, fontWeight: '700', marginTop: 8, marginRight: 8 },
  balanceAmount: { color: '#FFFFFF', fontSize: 58, fontWeight: '900', letterSpacing: -2 },
  budgetEditRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 30, backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  budgetSubtext: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  budgetEditIcon: { marginLeft: 10 },

  progressBarBg: { height: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 5, marginBottom: 25, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statBoxLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  statBoxValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  // ── Mini Stats ──
  miniStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },

  // ── Quick Log Shortcuts ──
  quickSection: { marginBottom: 25 },
  quickHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 4 },
  quickSectionTitle: { fontSize: 14, fontWeight: '900', color: '#F8FAFC', letterSpacing: 1 },
  fastPill: { backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 10 },
  fastPillText: { color: '#38BDF8', fontSize: 10, fontWeight: '900' },
  quickSectionSub: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  quickTile: { width: 110, height: 110, borderRadius: 24, borderWidth: 1, marginRight: 15, overflow: 'hidden', backgroundColor: '#0F172A' },
  quickTileGrad: { flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center' },

  // ── Daily Safe Limit Card ──
  dailyBudgetCard: {
    padding: 24, borderRadius: 28, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 10 },
  healthBadge: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', minWidth: 100 },

  // ── Magic Shake Card ──
  shakeBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, marginBottom: 25,
    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.4)', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  shakeIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(139, 92, 246, 0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginLeft: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },

  // ── Category Breakdown ──
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  catIcon: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  catName: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  catBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', width: '100%' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmount: { color: '#F8FAFC', fontSize: 16, fontWeight: '900' },

  // ── Expense Item ──
  expenseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  expenseBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  expIcon: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  expCategory: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  expDate: { color: '#94A3B8', fontSize: 13, marginTop: 4, fontWeight: '600' },
  expAmount: { color: '#F43F5E', fontSize: 17, fontWeight: '900' },

  // ── FAB ──
  fabContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' },
  fabInner: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 8, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  voiceFab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 32, marginRight: 10 },
  voiceFabText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  addFab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06B6D4', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 32 },
  addFabText: { color: '#0F172A', fontWeight: '900', fontSize: 15 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalContent: { backgroundColor: '#1E293B', margin: 24, borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#F8FAFC', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  modalSubtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 24, lineHeight: 22, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16 },
  inputPrefix: { color: '#A78BFA', fontSize: 20, fontWeight: '900', marginRight: 12 },
  budgetInput: { flex: 1, color: '#F8FAFC', fontSize: 18, fontWeight: '800', paddingVertical: 18 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32 },
  modalBtn: { flex: 1, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
  modalBtnCancel: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  modalBtnCancelText: { color: '#F8FAFC', fontSize: 15, fontWeight: '900' },
  modalBtnSave: { backgroundColor: '#38BDF8' },
  modalBtnSaveText: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
  comparisonCard: { marginBottom: 25 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '800' },
  compValue: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  compBars: { alignItems: 'flex-end' },
  compBarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  compBarLabel: { color: '#64748B', fontSize: 11, width: 35, marginRight: 8, fontWeight: '700' },
  compBar: { height: 10, borderRadius: 5 },
  compBarAmount: { color: '#CBD5E1', fontSize: 12, marginLeft: 8, fontWeight: '800' },
  compVerdict: { color: '#94A3B8', fontSize: 13, marginTop: 15, lineHeight: 20, fontWeight: '600' },
});
"""

content = re.sub(r'const styles = StyleSheet\.create\({.*?\n}\);', new_styles, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(content)
