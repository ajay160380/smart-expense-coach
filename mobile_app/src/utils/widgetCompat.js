import { Platform, NativeModules, TurboModuleRegistry } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detect whether running in Expo Go client
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.executionEnvironment === 'storeClient' ||
  Boolean(Constants.expoVersion);

// Only attempt to require if the native module is actually compiled into the running binary!
// Calling require('react-native-android-widget') without this check in Expo Go throws
// TurboModuleRegistry.getEnforcing('AndroidWidget') which instantly kills the app!
const hasNativeSupport =
  !isExpoGo &&
  Platform.OS === 'android' &&
  (Boolean(NativeModules?.AndroidWidget) ||
   Boolean(TurboModuleRegistry?.get?.('AndroidWidget')));

let nativeWidget = null;

if (hasNativeSupport) {
  try {
    nativeWidget = require('react-native-android-widget');
  } catch (e) {
    console.log('[widgetCompat] Native widget module not available:', e?.message || e);
  }
}

export const registerWidgetTaskHandler = (handler) => {
  if (nativeWidget?.registerWidgetTaskHandler) {
    try {
      return nativeWidget.registerWidgetTaskHandler(handler);
    } catch (e) {
      console.log('[widgetCompat] registerWidgetTaskHandler error:', e);
    }
  }
};

export const requestWidgetUpdate = async (options) => {
  if (nativeWidget?.requestWidgetUpdate) {
    try {
      return await nativeWidget.requestWidgetUpdate(options);
    } catch (e) {
      console.log('[widgetCompat] requestWidgetUpdate error:', e);
    }
  }
  return false;
};

export const requestPinWidget = async (options) => {
  if (nativeWidget?.requestPinWidget) {
    try {
      return await nativeWidget.requestPinWidget(options);
    } catch (e) {
      console.log('[widgetCompat] requestPinWidget error:', e);
    }
  }
  return false;
};

export const FlexWidget = nativeWidget?.FlexWidget || ((props) => null);
export const TextWidget = nativeWidget?.TextWidget || ((props) => null);
export const SvgWidget = nativeWidget?.SvgWidget || ((props) => null);

export default {
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  requestPinWidget,
  FlexWidget,
  TextWidget,
  SvgWidget,
};
