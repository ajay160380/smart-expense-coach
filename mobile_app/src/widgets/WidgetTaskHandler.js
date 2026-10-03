import React from 'react';
import { Linking } from 'react-native';
import { AddExpenseWidget } from './AddExpenseWidget';

export async function widgetTaskHandler(props) {
  const widgetAction = props.widgetAction;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<AddExpenseWidget />);
      break;

    case 'WIDGET_CLICK':
      if (props.clickAction === 'OPEN_ADD_EXPENSE') {
        // Deep link into the app to open the Add Expense screen
        Linking.openURL('paisamitra://add');
      }
      break;

    default:
      break;
  }
}
