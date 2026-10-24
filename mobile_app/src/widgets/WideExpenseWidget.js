import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';

export function WideExpenseWidget({ stats = null }) {
  const spentVal = stats?.total_spent ?? 1200;
  const budgetVal = stats?.budget ?? 18800;
  const budgetPct = stats?.budget_percent ?? (budgetVal > 0 ? Math.min(100, Math.round((spentVal / budgetVal) * 100)) : 6);

  const spentFormatted = Number(spentVal).toLocaleString('en-IN');
  const budgetFormatted = Number(budgetVal).toLocaleString('en-IN');

  // Status badge label
  let statusBadge = 'SAFE';
  if (budgetPct > 100) {
    statusBadge = 'ALERT';
  } else if (budgetPct > 80) {
    statusBadge = 'WARN';
  }

  // Recent items for bottom pills
  const recentList = stats?.recent_expenses || [];
  let pill1Text = 'Grocery ₹400';
  let pill2Text = 'Rent ₹800';

  if (recentList.length > 0) {
    const item1 = recentList[0];
    const name1 = item1.title || item1.category || 'Expense';
    const amt1 = Number(item1.amount || 0).toLocaleString('en-IN');
    pill1Text = `${name1} ₹${amt1}`;
  }
  if (recentList.length > 1) {
    const item2 = recentList[1];
    const name2 = item2.title || item2.category || 'Expense';
    const amt2 = Number(item2.amount || 0).toLocaleString('en-IN');
    pill2Text = `${name2} ₹${amt2}`;
  }

  // 20 segments in progress bar
  const totalSegments = 20;
  const activeSegments = Math.max(1, Math.min(totalSegments, Math.round((budgetPct / 100) * totalSegments)));

  const plusSvg = `<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#1E40AF" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
  const micSvg = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#1E40AF" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path fill="#1E40AF" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundGradient: {
          from: '#1D4ED8',
          to: '#1E40AF',
          orientation: 'TL_BR',
        },
        borderRadius: 26,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
      clickAction="OPEN_ADD_EXPENSE"
    >
      {/* ── Left Column: Information, Metric, Progress & Recent Pills ── */}
      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Header row: Expense Tracker + SAFE badge */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Expense Tracker"
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />

          <FlexWidget
            style={{
              backgroundColor: '#93C5FD',
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginLeft: 8,
            }}
          >
            <TextWidget
              text={statusBadge}
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: '#0F172A',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Subtitle: THIS MONTH · 6% */}
        <TextWidget
          text={`THIS MONTH · ${budgetPct}%`}
          style={{
            fontSize: 10,
            fontWeight: 'bold',
            color: '#BFDBFE',
            marginTop: 4,
          }}
        />

        {/* Large Amount & Total Budget */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginTop: 2,
          }}
        >
          <TextWidget
            text={`₹${spentFormatted}`}
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />
          <TextWidget
            text={` / ₹${budgetFormatted}`}
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: '#BFDBFE',
              marginLeft: 4,
              marginBottom: 3,
            }}
          />
        </FlexWidget>

        {/* Segmented Progress Bar */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            marginBottom: 6,
          }}
        >
          {Array.from({ length: totalSegments }).map((_, index) => {
            const isLit = index < activeSegments;
            return (
              <FlexWidget
                key={index}
                style={{
                  width: 5,
                  height: 12,
                  borderRadius: 2.5,
                  backgroundColor: isLit ? '#93C5FD' : '#2563EB',
                  marginRight: 3,
                }}
              />
            );
          })}
        </FlexWidget>

        {/* Bottom Category/Expense Pills */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: '#2752B3',
              borderRadius: 14,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginRight: 8,
            }}
            clickAction="OPEN_ADD_EXPENSE"
          >
            <TextWidget
              text={pill1Text}
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: '#2752B3',
              borderRadius: 14,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
            clickAction="OPEN_ADD_EXPENSE"
          >
            <TextWidget
              text={pill2Text}
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* ── Right Column: Big Circular Add Button + Mic Pill ── */}
      <FlexWidget
        style={{
          width: 88,
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginLeft: 8,
        }}
      >
        {/* Top: Glowing Circular + Button */}
        <FlexWidget
          style={{
            width: 66,
            height: 66,
            borderRadius: 33,
            backgroundColor: '#EBF3FF',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_ADD_EXPENSE"
        >
          <SvgWidget
            svg={plusSvg}
            style={{
              width: 28,
              height: 28,
            }}
          />
        </FlexWidget>

        {/* Bottom: White Capsule Button with Mic */}
        <FlexWidget
          style={{
            width: 80,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
          }}
          clickAction="OPEN_VOICE"
        >
          <SvgWidget
            svg={micSvg}
            style={{
              width: 20,
              height: 20,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export default WideExpenseWidget;
