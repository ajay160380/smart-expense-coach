import React from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AddExpenseWidget } from './AddExpenseWidget';
import { WideExpenseWidget } from './WideExpenseWidget';

export async function widgetTaskHandler(props) {
  const widgetAction = props.widgetAction;
  const widgetName = props.widgetInfo?.widgetName;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let stats = null;
      try {
        const cached = await AsyncStorage.getItem('dashboard_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          stats = parsed?.stats || null;
        }
      } catch (e) {}

      // Dedicated rendering: 2x2 always renders AddExpenseWidget, 4x2 always renders WideExpenseWidget
      if (widgetName === 'WideExpenseWidget') {
        props.renderWidget(<WideExpenseWidget stats={stats} />);
      } else {
        props.renderWidget(<AddExpenseWidget stats={stats} />);
      }
      break;
    }

    case 'WIDGET_CLICK':
      if (props.clickAction === 'OPEN_ADD_EXPENSE') {
        Linking.openURL('paisamitra://add');
      } else if (props.clickAction === 'OPEN_VOICE') {
        Linking.openURL('paisamitra://voice');
      }
      break;

    default:
      break;
  }
}
