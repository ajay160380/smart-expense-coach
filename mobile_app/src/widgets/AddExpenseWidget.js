import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function AddExpenseWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: {
          from: '#0D1322',
          to: '#181E34',
          orientation: 'TL_BR',
        },
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#2A3655',
        padding: 14,
      }}
      clickAction="OPEN_ADD_EXPENSE"
    >
      {/* Top Header Row */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="ExpenseTracker"
            style={{
              fontSize: 13,
              color: '#F8FAFC',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#1E293B',
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: '#38BDF8',
          }}
        >
          <TextWidget
            text="AI ⚡"
            style={{
              fontSize: 10,
              color: '#38BDF8',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Center Action Button (Glowing Hero) */}
      <FlexWidget
        style={{
          height: 60,
          width: 60,
          borderRadius: 30,
          backgroundGradient: {
            from: '#8B5CF6',
            to: '#6366F1',
            orientation: 'TL_BR',
          },
          borderWidth: 2,
          borderColor: '#C4B5FD',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="+"
          style={{
            fontSize: 34,
            color: '#FFFFFF',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        />
      </FlexWidget>

      {/* Bottom Text and Status */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="Tap to Add Expense"
          style={{
            fontSize: 13,
            color: '#FFFFFF',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        />
        <TextWidget
          text="Quick 1-Tap Entry"
          style={{
            fontSize: 10,
            color: '#94A3B8',
            textAlign: 'center',
            marginTop: 2,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
