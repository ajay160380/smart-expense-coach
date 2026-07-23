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
        { width: 220 * s, height: 220 * s, justifyContent: 'center', alignItems: 'center' },
        circle ? { backgroundColor: '#FFF', borderRadius: 110 * s, shadowColor: '#000', shadowOffset: { width: 0, height: 10 * s }, shadowOpacity: 0.1, shadowRadius: 20 * s, elevation: 10 } : {}
      ]}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={{ width: 180 * s, height: 180 * s, resizeMode: 'contain', borderRadius: 24 * s }} 
        />
      </View>
    </View>
  );
}
