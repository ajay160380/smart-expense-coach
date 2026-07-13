import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Logo({ size = 1, showText = true, circle = true }) {
  const s = size; 
  const dark = '#2C353F';
  const blue = '#1A73E8';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Circle Wrapper for Icon */}
      <View style={[
        { width: 140 * s, height: 140 * s, justifyContent: 'center', alignItems: 'center' },
        circle ? { backgroundColor: '#FFF', borderRadius: 70 * s, shadowColor: '#000', shadowOffset: { width: 0, height: 10 * s }, shadowOpacity: 0.1, shadowRadius: 20 * s, elevation: 10 } : {}
      ]}>
        {/* The E mark */}
        <View style={{ width: 100 * s, height: 100 * s, position: 'relative' }}>
          
          {/* Main Vertical Bar */}
          <View style={{ position: 'absolute', left: 10 * s, top: 5 * s, width: 28 * s, height: 90 * s, backgroundColor: dark, borderTopLeftRadius: 15 * s, borderBottomLeftRadius: 2 * s }} />
          
          {/* Top Horizontal */}
          <View style={{ position: 'absolute', left: 30 * s, top: 5 * s, width: 65 * s, height: 26 * s, backgroundColor: dark, borderTopRightRadius: 2 * s }} />
          
          {/* Middle Horizontal */}
          <View style={{ position: 'absolute', left: 30 * s, top: 40 * s, width: 50 * s, height: 20 * s, backgroundColor: dark }} />
          
          {/* Bottom Horizontal */}
          <View style={{ position: 'absolute', left: 30 * s, bottom: 5 * s, width: 60 * s, height: 26 * s, backgroundColor: dark, borderBottomRightRadius: 2 * s }} />

          {/* The Blue Graph Line */}
          <View style={{ position: 'absolute', left: -2 * s, bottom: 20 * s, width: 45 * s, height: 8 * s, backgroundColor: blue, transform: [{ rotate: '-32deg' }], zIndex: 10 }} />
          <View style={{ position: 'absolute', left: 24 * s, bottom: 33 * s, width: 24 * s, height: 24 * s, borderRadius: 12 * s, backgroundColor: circle ? '#FFF' : '#F8F9FA', zIndex: 11 }} />
          <View style={{ position: 'absolute', left: 29 * s, bottom: 38 * s, width: 14 * s, height: 14 * s, borderRadius: 7 * s, backgroundColor: blue, zIndex: 12 }} />
          <View style={{ position: 'absolute', left: 36 * s, bottom: 41 * s, width: 22 * s, height: 8 * s, backgroundColor: blue, zIndex: 10 }} />
          <View style={{ position: 'absolute', left: 52 * s, bottom: 57 * s, width: 42 * s, height: 8 * s, backgroundColor: blue, transform: [{ rotate: '-40deg' }], zIndex: 10 }} />
          
          {/* Arrow Head */}
          <View style={{ position: 'absolute', right: -6 * s, top: 12 * s, width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 10 * s, borderRightWidth: 10 * s, borderBottomWidth: 20 * s, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: blue, transform: [{ rotate: '50deg' }], zIndex: 11 }} />
        </View>
      </View>

      {/* TEXT */}
      {showText && (
        <View style={{ alignItems: 'center', marginTop: 20 * s }}>
          <Text style={{ fontFamily: 'System', fontSize: 32 * s, fontWeight: '900', color: dark, letterSpacing: 4 * s }}>
            EXPANSE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 * s }}>
            <View style={{ width: 40 * s, height: 2 * s, backgroundColor: blue }} />
            <Text style={{ fontFamily: 'System', fontSize: 16 * s, fontWeight: '700', color: blue, letterSpacing: 8 * s, marginHorizontal: 12 * s }}>
              TRACKER
            </Text>
            <View style={{ width: 40 * s, height: 2 * s, backgroundColor: blue }} />
          </View>
        </View>
      )}
    </View>
  );
}
