import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove import
    content = content.replace("import Svg, { Circle, G } from 'react-native-svg';\n", "")
    
    # Replace DonutChart
    old_donut = """const DonutChart = ({ data, totalAmount }) => {
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
};"""

    new_donut = """const DonutChart = ({ data, totalAmount }) => {
  const size = 110;
  const strokeWidth = 14;
  const mainColor = data && data.length > 0 ? data[0].color : '#A78BFA';
  
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', borderRadius: size / 2, borderWidth: strokeWidth, borderColor: mainColor + '40' }}>
      <View style={{ width: size - strokeWidth*2, height: size - strokeWidth*2, borderRadius: size, borderWidth: 2, borderColor: mainColor, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>₹{totalAmount}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2, fontWeight: '600' }}>Total Spent</Text>
      </View>
    </View>
  );
};"""

    content = content.replace(old_donut, new_donut)
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_file('src/screens/DashboardScreen.js')
fix_file('src/screens/AnalyticsScreen.js')
print("Done fixing DonutChart")
