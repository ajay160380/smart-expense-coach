import React from 'react';
import { View, Text, Image } from 'react-native';

export default function Logo({ size = 1, showText = true, circle = true }) {
  const s = size; 
  const dark = '#2C353F';
  const blue = '#1A73E8';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Wrapper for Icon */}
      <View style={[
        { width: 140 * s, height: 140 * s, justifyContent: 'center', alignItems: 'center' },
        circle ? { backgroundColor: '#FFF', borderRadius: 70 * s, shadowColor: '#000', shadowOffset: { width: 0, height: 10 * s }, shadowOpacity: 0.1, shadowRadius: 20 * s, elevation: 10 } : {}
      ]}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={{ width: 100 * s, height: 100 * s, resizeMode: 'contain' }} 
        />
      </View>

      {/* TEXT */}
      {showText && (
        <View style={{ alignItems: 'center', marginTop: 20 * s }}>
          <Text style={{ fontFamily: 'System', fontSize: 32 * s, fontWeight: '900', color: dark, letterSpacing: 4 * s }}>
            EXPENSE
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
