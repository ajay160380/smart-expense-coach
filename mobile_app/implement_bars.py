import re

def rewrite_dashboard(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the DonutChart definition and remove it completely
    donut_pattern = r"const DonutChart = \(\{ data, totalAmount \}\) => \{.*?^\};\n\n"
    content = re.sub(donut_pattern, "", content, flags=re.MULTILINE | re.DOTALL)
    
    # Replace Dashboard Category Breakdown
    old_section_pattern = r"\{\/\* ── CATEGORY BREAKDOWN \(Donut Style\) ── \*\/.*?<\/\>(\s*\)\})?"
    old_section_pattern2 = r"\{\/\* ── CATEGORY BREAKDOWN \(Donut Style\) ── \*\/.*?(?=\{\/\* ── AI FINANCIAL COACH)"
    
    new_dashboard_section = """        {/* ── CATEGORY BREAKDOWN (Progress Bar Style) ── */}
        {recentExpenses.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8, paddingHorizontal: 4 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }}>Category Breakdown</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Analytics')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '600', marginRight: 4 }}>Details</Text>
                <Ionicons name="arrow-forward" size={14} color="#38BDF8" />
              </TouchableOpacity>
            </View>

            <GlassCard style={{ padding: 16 }}>
              {getCategoryBreakdown(recentExpenses).slice(0, 3).map((cat, idx) => (
                <View key={idx} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: idx < Math.min(getCategoryBreakdown(recentExpenses).length - 1, 2) ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.05)'
                }}>
                  {/* Icon */}
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Text style={{ fontSize: 22 }}>{cat.icon || getFallbackIcon(cat.category)}</Text>
                  </View>
                  
                  {/* Name & Progress Bar */}
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600', marginBottom: 8 }} numberOfLines={1}>{cat.title || cat.name}</Text>
                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(cat.percent || 0, 100)}%`, height: '100%', backgroundColor: cat.color || '#A78BFA', borderRadius: 2 }} />
                    </View>
                  </View>
                  
                  {/* Amount */}
                  <Text style={{ color: '#F8FAFC', fontSize: 15, fontWeight: '700' }}>₹{Math.round(cat.total).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </GlassCard>
          </View>
        )}
        
"""
    content = re.sub(old_section_pattern2, new_dashboard_section, content, flags=re.MULTILINE | re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(content)


def rewrite_analytics(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    donut_pattern = r"const DonutChart = \(\{ data, totalAmount \}\) => \{.*?^\};\n\n"
    content = re.sub(donut_pattern, "", content, flags=re.MULTILINE | re.DOTALL)
    
    old_section_pattern2 = r"\{\/\* ── Category Breakdown \(Donut Style\) ── \*\/.*?(?=\{\/\* ── Anomaly Alerts)"
    
    new_analytics_section = """        {/* ── Category Breakdown (Progress Bar Style) ── */}
        {categories.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8, paddingHorizontal: 4 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }}>Category Breakdown</Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '600', marginRight: 4 }}>Details</Text>
                <Ionicons name="arrow-forward" size={14} color="#38BDF8" />
              </TouchableOpacity>
            </View>

            <GlassCard style={{ padding: 16, marginBottom: 16 }}>
              {categories.map((cat, idx) => (
                <View key={idx} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: idx < categories.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.05)'
                }}>
                  {/* Icon */}
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Text style={{ fontSize: 22 }}>{cat.icon || getFallbackIcon(cat.category)}</Text>
                  </View>
                  
                  {/* Name & Progress Bar */}
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600', marginBottom: 8 }} numberOfLines={1}>{cat.title || cat.name}</Text>
                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(cat.percent || 0, 100)}%`, height: '100%', backgroundColor: cat.color || '#A78BFA', borderRadius: 2 }} />
                    </View>
                  </View>
                  
                  {/* Amount */}
                  <Text style={{ color: '#F8FAFC', fontSize: 15, fontWeight: '700' }}>₹{Math.round(cat.total).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </GlassCard>
          </>
        )}
        
"""
    content = re.sub(old_section_pattern2, new_analytics_section, content, flags=re.MULTILINE | re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(content)

rewrite_dashboard('src/screens/DashboardScreen.js')
rewrite_analytics('src/screens/AnalyticsScreen.js')
print("Replaced with Progress Bar design")
