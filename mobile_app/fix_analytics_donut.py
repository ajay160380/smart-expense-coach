import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # The actual regex match to replace the DonutChart component
    pattern = r"const DonutChart = \(\{ data, totalAmount \}\) => \{.*?^\};\n"
    
    new_donut = """const DonutChart = ({ data, totalAmount }) => {
  const size = 110;
  const strokeWidth = 14;
  const mainColor = (data && data.length > 0 && data[0].color) ? data[0].color : '#A78BFA';
  
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', borderRadius: size / 2, borderWidth: strokeWidth, borderColor: mainColor + '40' }}>
      <View style={{ width: size - strokeWidth*2, height: size - strokeWidth*2, borderRadius: size, borderWidth: 2, borderColor: mainColor, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>₹{totalAmount}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2, fontWeight: '600' }}>Total Spent</Text>
      </View>
    </View>
  );
};
"""
    # Let's replace the whole DonutChart block
    content = re.sub(pattern, new_donut, content, flags=re.MULTILINE | re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_file('src/screens/AnalyticsScreen.js')
print("Done fixing AnalyticsScreen DonutChart")
