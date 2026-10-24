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
      let preferredLayout = 'AddExpenseWidget';
      try {
        const cached = await AsyncStorage.getItem('dashboard_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          stats = parsed?.stats || null;
        }
        const pref = await AsyncStorage.getItem('preferred_widget_layout');
        if (pref) preferredLayout = pref;
      } catch (e) {}

      // Render wide if widget is WideExpenseWidget, user chose Wide, or width is resized wide (> 220dp)
      const isWide =
        widgetName === 'WideExpenseWidget' ||
        preferredLayout === 'WideExpenseWidget' ||
        (props.widgetInfo?.width && props.widgetInfo.width > 220);

      if (isWide) {
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
