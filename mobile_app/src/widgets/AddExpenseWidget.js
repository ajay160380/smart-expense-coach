import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function AddExpenseWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E293B', // A slightly lighter dark background
        borderRadius: 24,
        padding: 16,
      }}
      clickAction="OPEN_ADD_EXPENSE"
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <TextWidget
          text="Expense Tracker"
          style={{ fontSize: 16, color: '#A888FF', fontWeight: 'bold' }}
        />
        <TextWidget
          text="₹"
          style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          height: 64,
          width: 64,
          borderRadius: 32,
          backgroundColor: '#8B5CF6',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <TextWidget
          text="+"
          style={{
            fontSize: 40,
            color: '#FFFFFF',
          }}
        />
      </FlexWidget>
      
      <TextWidget
        text="Quick Add"
        style={{
          fontSize: 14,
          color: '#FFFFFF',
          fontWeight: 'bold',
        }}
      />
    </FlexWidget>
  );
}
