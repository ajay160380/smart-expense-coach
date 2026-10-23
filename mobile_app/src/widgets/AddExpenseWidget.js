import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function AddExpenseWidget({ stats = null }) {
  const spentVal = stats?.total_spent ?? 0;
  const budgetVal = stats?.budget ?? 20000;
  const remainingVal = stats?.remaining ?? Math.max(0, budgetVal - spentVal);
  const budgetPct = stats?.budget_percent ?? (budgetVal > 0 ? Math.min(100, Math.round((spentVal / budgetVal) * 100)) : 0);

  const spentFormatted = Number(spentVal).toLocaleString('en-IN');
  const remainingFormatted = Number(remainingVal).toLocaleString('en-IN');
  const usedPct = Math.max(1, Math.min(100, Math.round(budgetPct)));
  const leftPct = Math.max(1, 100 - usedPct);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: {
          from: '#FFFFFF',
          to: '#F8FAFC',
          orientation: 'TL_BR',
        },
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 12,
      }}
      clickAction="OPEN_ADD_EXPENSE"
    >
      {/* ── Top Header Row: Brand & Status ── */}
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
            text="💳 PaisaMitra"
            style={{
              fontSize: 12,
              color: '#0F172A',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#ECFDF5',
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: '#A7F3D0',
          }}
        >
          <TextWidget
            text="SAFE ⚡"
            style={{
              fontSize: 9,
              color: '#059669',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Center Section: Live Financial Snapshot & Runway ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          backgroundColor: '#F1F5F9',
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 8,
          flexDirection: 'column',
          borderWidth: 1,
          borderColor: '#E2E8F0',
        }}
      >
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="THIS MONTH"
            style={{
              fontSize: 8.5,
              color: '#64748B',
              fontWeight: 'bold',
              letterSpacing: 0.5,
            }}
          />
          <TextWidget
            text={`${usedPct}% of budget`}
            style={{
              fontSize: 8.5,
              color: usedPct > 90 ? '#EF4444' : '#059669',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 3,
          }}
        >
          <TextWidget
            text={`₹${spentFormatted}`}
            style={{
              fontSize: 18,
              color: '#0F172A',
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={`₹${remainingFormatted} left`}
            style={{
              fontSize: 10,
              color: '#64748B',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* Dual Progress Bar using Flex ratio */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 4,
            borderRadius: 2,
            marginTop: 6,
            flexDirection: 'row',
          }}
        >
          <FlexWidget
            style={{
              flex: usedPct,
              height: 4,
              backgroundColor: usedPct > 90 ? '#EF4444' : '#10B981',
              borderRadius: 2,
            }}
          />
          <FlexWidget
            style={{
              flex: leftPct,
              height: 4,
              backgroundColor: '#CBD5E1',
              borderRadius: 2,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Bottom Section: 1-Tap Action Shortcuts ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Main Action: + Add Expense */}
        <FlexWidget
          style={{
            flex: 1,
            height: 38,
            backgroundGradient: {
              from: '#7C3AED',
              to: '#6366F1',
              orientation: 'TL_BR',
            },
            borderRadius: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#A78BFA',
          }}
          clickAction="OPEN_ADD_EXPENSE"
        >
          <TextWidget
            text="+ Add Expense"
            style={{
              fontSize: 11.5,
              color: '#FFFFFF',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* Voice Logging Shortcut: 🎙️ */}
        <FlexWidget
          style={{
            width: 38,
            height: 38,
            backgroundColor: '#F3E8FF',
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#DDD6FE',
            marginLeft: 6,
          }}
          clickAction="OPEN_VOICE"
        >
          <TextWidget
            text="🎙️"
            style={{
              fontSize: 15,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export default AddExpenseWidget;
