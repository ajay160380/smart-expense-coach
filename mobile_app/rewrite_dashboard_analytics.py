import re

with open('src/screens/DashboardScreen.js', 'r') as f:
    content = f.read()

# 1. Add import for Svg, Circle, G
import_svg = "import Svg, { Circle, G } from 'react-native-svg';\n"
if "react-native-svg" not in content:
    content = content.replace("import api from '../api/config';", import_svg + "import api from '../api/config';")


# 2. DonutChart Component to insert
donut_chart_component = """
const DonutChart = ({ data, totalAmount }) => {
  const size = 110;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {data.map((item, index) => {
            const strokeLength = ((item.percent || 0) / 100) * circumference;
            const offset = currentOffset;
            currentOffset += strokeLength;
            return (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={item.color || '#888'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={-offset}
                fill="transparent"
                strokeLinecap="round"
              />
            );
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>₹{totalAmount}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2, fontWeight: '600' }}>Total Spent</Text>
      </View>
    </View>
  );
};
"""

if "const DonutChart =" not in content:
    content = content.replace("export default function DashboardScreen({ navigation }) {", donut_chart_component + "\nexport default function DashboardScreen({ navigation }) {")

# 3. Replace the Category Breakdown section
old_cat_section = """        {/* ── CATEGORY BREAKDOWN ── */}
        {recentExpenses.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <SectionHeader title="Category Breakdown" actionText="Details →" onAction={() => navigation.navigate('Analytics')} />
            <GlassCard style={{ paddingVertical: 4 }}>
              {getCategoryBreakdown(recentExpenses).slice(0, 4).map((cat, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.catRow}
                  onPress={() => navigation.navigate('Analytics')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                    <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                  <Text style={styles.catAmount}>₹{cat.total.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        )}"""

new_cat_section = """        {/* ── CATEGORY BREAKDOWN (Donut Style) ── */}
        {recentExpenses.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(139, 92, 246, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Ionicons name="pie-chart" size={16} color="#A78BFA" />
                </View>
                <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>Category Breakdown</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Analytics')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '700', marginRight: 4 }}>Details</Text>
                <Ionicons name="arrow-forward" size={14} color="#38BDF8" />
              </TouchableOpacity>
            </View>

            <GlassCard style={{ flexDirection: 'row', padding: 20, alignItems: 'center', marginBottom: 16 }}>
              {/* Left Donut */}
              <DonutChart data={getCategoryBreakdown(recentExpenses)} totalAmount={Math.round(recentExpenses.reduce((sum, item) => sum + Number(item.amount), 0)).toLocaleString('en-IN')} />

              {/* Right List */}
              <View style={{ flex: 1, marginLeft: 20 }}>
                {getCategoryBreakdown(recentExpenses).slice(0, 3).map((cat, idx) => (
                  <View key={idx} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: idx < Math.min(getCategoryBreakdown(recentExpenses).length - 1, 2) ? 1 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.06)'
                  }}>
                    {/* Dot */}
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color || '#888', marginRight: 8 }} />
                    {/* Icon */}
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                      <Text style={{ fontSize: 12 }}>{cat.icon || getFallbackIcon(cat.category)}</Text>
                    </View>
                    {/* Name */}
                    <Text style={{ flex: 1, color: '#E2E8F0', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{cat.title || cat.name}</Text>
                    {/* Amount & Percent */}
                    <View style={{ alignItems: 'flex-end', marginLeft: 6 }}>
                      <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '700' }}>₹{Math.round(cat.total).toLocaleString('en-IN')}</Text>
                      <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{Math.round(cat.percent)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>
          </View>
        )}"""

content = content.replace(old_cat_section, new_cat_section)

with open('src/screens/DashboardScreen.js', 'w') as f:
    f.write(content)

print("Done replacing DashboardScreen.js content.")
