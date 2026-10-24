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

  const micSvg = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#ffffff" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path fill="#ffffff" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#205FE6',
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
      clickAction="OPEN_ADD_EXPENSE"
    >
      {/* ── Top Header Row: Expense + SAFE Badge (Single compact line) ── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="Expense"
          style={{
            fontSize: 13,
            color: '#FFFFFF',
            fontWeight: 'bold',
          }}
        />

        <FlexWidget
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <TextWidget
            text={statusBadge}
            style={{
              fontSize: 9,
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
          marginTop: 2,
        }}
      >
        {/* Crisp, perfectly fitting amount */}
        <TextWidget
          text={`₹${spentFormatted}`}
          style={{
            fontSize: 25,
            color: '#FFFFFF',
            fontWeight: 'bold',
          }}
        />

        {/* Hindi/English clean subtitle */}
        <TextWidget
          text={`खर्च · ${budgetPct}% (बजट ₹${budgetFormatted})`}
          style={{
            fontSize: 10,
            color: '#DCE7FE',
            marginTop: 2,
          }}
        />

        {/* Progress Slider Track with Round Thumb */}
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 6,
            borderRadius: 3,
            backgroundColor: '#4379EE',
            marginTop: 6,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 1,
          }}
        >
          <FlexWidget
            style={{
              flex: Math.max(1, Math.min(94, usedPct)),
              height: 6,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <FlexWidget
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#FFFFFF',
              }}
            />
          </FlexWidget>
          <FlexWidget
            style={{
              flex: Math.max(1, 100 - Math.min(94, usedPct)),
              height: 6,
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
          marginTop: 6,
        }}
      >
        {/* Main Action: + Add */}
        <FlexWidget
          style={{
            flex: 1,
            height: 34,
            backgroundColor: '#FFFFFF',
            borderRadius: 17,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_ADD_EXPENSE"
        >
          <TextWidget
            text="+ Add"
            style={{
              fontSize: 13,
              color: '#205FE6',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* Voice Logging Shortcut: 🎙️ */}
        <FlexWidget
          style={{
            width: 34,
            height: 34,
            backgroundColor: '#4379EE',
            borderRadius: 17,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
          }}
          clickAction="OPEN_VOICE"
        >
          <SvgWidget
            svg={micSvg}
            style={{
              width: 16,
              height: 16,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export default AddExpenseWidget;
