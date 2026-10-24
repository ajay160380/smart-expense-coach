import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';

export function AddExpenseWidget({ stats = null }) {
  const spentVal = stats?.total_spent ?? 1200;
  const budgetVal = stats?.budget ?? 18800;
  const budgetPct = stats?.budget_percent ?? (budgetVal > 0 ? Math.min(100, Math.round((spentVal / budgetVal) * 100)) : 6);

  const spentFormatted = Number(spentVal).toLocaleString('en-IN');
  const budgetFormatted = Number(budgetVal).toLocaleString('en-IN');
  const usedPct = Math.max(1, Math.min(100, Math.round(budgetPct)));

  // Status badge label
  let statusBadge = 'SAFE';
  if (budgetPct > 100) {
    statusBadge = 'ALERT';
  } else if (budgetPct > 80) {
    statusBadge = 'WARN';
  }

  const micSvg = `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#ffffff" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path fill="#ffffff" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#205FE6',
        borderRadius: 28,
        padding: 16,
      }}
      clickAction="OPEN_ADD_EXPENSE"
    >
      {/* ── Top Header Row: Expense Tracker & SAFE ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="Expense Tracker"
          style={{
            fontSize: 16,
            color: '#FFFFFF',
            fontWeight: 'bold',
          }}
        />

        <FlexWidget
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={statusBadge}
            style={{
              fontSize: 11,
              color: budgetPct > 100 ? '#EF4444' : '#205FE6',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Center Section: Big Amount, Subtitle & Progress Bar ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'column',
          marginTop: 4,
          marginBottom: 4,
        }}
      >
        <TextWidget
          text={`₹${spentFormatted}`}
          style={{
            fontSize: 38,
            color: '#FFFFFF',
            fontWeight: 'bold',
          }}
        />

        <TextWidget
          text={`spent · ${budgetPct}% of ₹${budgetFormatted}`}
          style={{
            fontSize: 13,
            color: '#FFFFFF',
            fontWeight: 'bold',
            marginTop: 2,
          }}
        />

        {/* Progress Slider Track with round indicator */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 10,
            borderRadius: 5,
            backgroundColor: '#4379EE',
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 1,
          }}
        >
          <FlexWidget
            style={{
              flex: Math.max(1, Math.min(94, usedPct)),
              height: 8,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <FlexWidget
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#FFFFFF',
              }}
            />
          </FlexWidget>
          <FlexWidget
            style={{
              flex: Math.max(1, 100 - Math.min(94, usedPct)),
              height: 8,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Bottom Section: + Add Button & Voice Mic Button ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Main Action: + Add */}
        <FlexWidget
          style={{
            flex: 1,
            height: 48,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_ADD_EXPENSE"
        >
          <TextWidget
            text="+ Add"
            style={{
              fontSize: 18,
              color: '#205FE6',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* Voice Logging Shortcut: 🎙️ */}
        <FlexWidget
          style={{
            width: 48,
            height: 48,
            backgroundColor: '#4379EE',
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 10,
          }}
          clickAction="OPEN_VOICE"
        >
          <SvgWidget
            svg={micSvg}
            style={{
              width: 22,
              height: 22,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export default AddExpenseWidget;
