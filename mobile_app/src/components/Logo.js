

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function Logo({ size = 1, showText = true, circle = true }) {
  const s = size; 

  return (
    <View style={styles.center}>
      {/* Wrapper for Icon with stable Android elevation */}
      <View style={[
        { width: 220 * s, height: 220 * s, justifyContent: 'center', alignItems: 'center' },
        circle ? {
          backgroundColor: '#FFFFFF',
          borderRadius: 110 * s,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 * s },
          shadowOpacity: 0.1,
          shadowRadius: 16 * s,
          elevation: 5,
        } : {}
      ]}>
        <Image 
          source={require('../../assets/icon.png')} 
          resizeMode="contain"
          style={{ width: 180 * s, height: 180 * s, borderRadius: 90 * s }} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
