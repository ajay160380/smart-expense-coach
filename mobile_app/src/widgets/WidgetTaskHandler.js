import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { AddExpenseWidget } from './AddExpenseWidget';
import { Linking } from 'react-native';

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
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
        // Ensure you have a valid scheme in app.json for this to work natively
        Linking.openURL('paisamitra://add');
      }
      break;

    default:
      break;
  }
}
