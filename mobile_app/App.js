/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — APP.JS (COMPLETE NAVIGATION)
 * Bottom Tab + Stack navigation with auth flow
 * ═══════════════════════════════════════════════════════════════
 */

import 'react-native-gesture-handler';
if (__DEV__) {
  require('./src/reticle-dev');
}
import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef, getFocusedRouteNameFromRoute, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Alert, PermissionsAndroid, DeviceEventEmitter, Vibration, AppState, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from './src/components/Logo';
import MoneySplashScreen from './src/components/MoneySplashScreen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlertModal, { installGlobalAlert, showCustomAlert } from './src/components/CustomAlertModal';
import * as Updates from 'expo-updates';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { checkAppVersion, subscribeToUpdateStatus } from './src/utils/versionCheck';

installGlobalAlert();
import { Accelerometer } from 'expo-sensors';
import { setUnauthorizedHandler, BASE_URL } from './src/api/config';
import { getToken } from './src/utils/auth';
import messaging from './src/utils/messaging';
import { saveNotification } from './src/utils/notifications';
import { scheduleRandomNotifications } from './src/utils/localNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
// ── Auth Screens ──
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';

// ── Main Screens ──
import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SavingsGoalsScreen from './src/screens/SavingsGoalsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MoreFeaturesScreen from './src/screens/MoreFeaturesScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';

// ── Stack Screens (accessible from tabs) ──
import AIChatScreen from './src/screens/AIChatScreen';
import ExpenseSplitScreen from './src/screens/ExpenseSplitScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import VoiceExpenseScreen from './src/screens/VoiceExpenseScreen';
import NotepadScreen from './src/screens/NotepadScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsScreen from './src/screens/TermsScreen';
import NotFoundScreen from './src/screens/NotFoundScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import analytics from './src/utils/analytics';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const GoalsStack = createStackNavigator();
const MoreStack = createStackNavigator();

export const navigationRef = createNavigationContainerRef();

// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// HOME STACK — Dashboard + sub-screens
// ═══════════════════════════════════════════════
function HomeStackScreen() {
  const { colors } = useTheme();
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      <HomeStack.Screen name="DashboardMain" component={DashboardScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
      <HomeStack.Screen name="AIChat" component={AIChatScreen} />
      <HomeStack.Screen name="VoiceExpense" component={VoiceExpenseScreen} />
      <HomeStack.Screen name="AddExpense" component={AddExpenseScreen} />
      <HomeStack.Screen name="ExpenseSplit" component={ExpenseSplitScreen} />
      <HomeStack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
      <HomeStack.Screen name="Notepad" component={NotepadScreen} />
      <HomeStack.Screen name="History" component={HistoryScreen} />
      <HomeStack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      <HomeStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <HomeStack.Screen name="Terms" component={TermsScreen} />
      <HomeStack.Screen name="NotFound" component={NotFoundScreen} />
    </HomeStack.Navigator>
  );
}

// ═══════════════════════════════════════════════
// GOALS STACK
// ═══════════════════════════════════════════════
function GoalsStackScreen() {
  const { colors } = useTheme();
  return (
    <GoalsStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      <GoalsStack.Screen name="GoalsMain" component={SavingsGoalsScreen} />
    </GoalsStack.Navigator>
  );
}

// ═══════════════════════════════════════════════
// MORE FEATURES STACK (Workspace & Tools)
// ═══════════════════════════════════════════════
function MoreStackScreen() {
  const { colors } = useTheme();
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      <MoreStack.Screen name="MoreMain" component={MoreFeaturesScreen} />
      <MoreStack.Screen name="Profile" component={ProfileScreen} />
      <MoreStack.Screen name="AIChat" component={AIChatScreen} />
      <MoreStack.Screen name="Analytics" component={AnalyticsScreen} />
      <MoreStack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      <MoreStack.Screen name="ExpenseSplit" component={ExpenseSplitScreen} />
      <MoreStack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <MoreStack.Screen name="VoiceExpense" component={VoiceExpenseScreen} />
      <MoreStack.Screen name="AdminPanel" component={AdminPanelScreen} />
      <MoreStack.Screen name="Notepad" component={NotepadScreen} />
      <MoreStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <MoreStack.Screen name="Terms" component={TermsScreen} />
      <MoreStack.Screen name="NotFound" component={NotFoundScreen} />
    </MoreStack.Navigator>
  );
}

// ═══════════════════════════════════════════════
// CUSTOM ADD BUTTON (Center FAB with White Ring)
// ═══════════════════════════════════════════════
function AddButton({ onPress }) {
  return (
    <View style={styles.addBtnContainer}>
      <View style={styles.addBtnWhiteRing}>
        <LinearGradient
          colors={['#A78BFA', '#7C3AED']}
          style={styles.addBtnGradient}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </LinearGradient>
      </View>
    </View>
  );
}

const HIDE_TAB_BAR_SCREENS = [
  'Profile',
  'AIChat',
  'VoiceExpense',
  'AddExpense',
  'ExpenseSplit',
  'Subscriptions',
  'Notifications',
  'Notepad',
  'History',
  'PrivacyPolicy',
  'Terms',
  'NotFound',
  'AdminPanel',
  'SavingsGoals',
  'Welcome',
];

// ═══════════════════════════════════════════════
// MAIN TAB NAVIGATOR (Luxury Light Floating Bar)
// ═══════════════════════════════════════════════
function MainTabNavigator() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUpdateStatus((st) => {
      setHasUpdate(Boolean(st?.hasUpdate));
    });
    return unsub;
  }, []);

  const bottomInset = insets?.bottom || 0;
  const isAndroid = Platform.OS === 'android';
  const bottomPadding = Platform.OS === 'ios'
    ? (bottomInset > 0 ? bottomInset : 24)
    : Math.max(bottomInset, 14);
  const tabHeight = (isAndroid ? 58 : 54) + bottomPadding;

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => {
        const routeName = getFocusedRouteNameFromRoute(route);
        const shouldHideTab = Boolean(routeName && HIDE_TAB_BAR_SCREENS.includes(routeName));

        return {
          headerShown: false,
          tabBarStyle: shouldHideTab
            ? { display: 'none' }
            : {
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: isDark ? colors.border : '#F1F5F9',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                height: tabHeight,
                paddingBottom: bottomPadding,
                paddingTop: 8,
                elevation: 16,
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 14,
              },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: isDark ? colors.textSecondary : '#94A3B8',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.3,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Analytics') iconName = focused ? 'analytics' : 'analytics-outline';
            else if (route.name === 'Add') iconName = 'add';
            else if (route.name === 'Goals') iconName = focused ? 'flag' : 'flag-outline';
            else if (route.name === 'More') iconName = focused ? 'grid' : 'grid-outline';
            return <Ionicons name={iconName} size={route.name === 'Add' ? 28 : 22} color={color} />;
          },
        };
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackScreen} 
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Home', { screen: 'DashboardMain' });
          },
        })}
      />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen
        name="Add"
        component={AddExpenseScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => <AddButton />,
        }}
      />
      <Tab.Screen name="Goals" component={GoalsStackScreen} />
      <Tab.Screen 
        name="More" 
        component={MoreStackScreen} 
        options={{ 
          tabBarLabel: 'Menu',
          tabBarBadge: hasUpdate ? 'NEW' : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: '900',
            lineHeight: 12,
            minWidth: 16,
            height: 16,
          },
        }} 
      />
    </Tab.Navigator>
  );
}

// ═══════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shakeSensitivity, setShakeSensitivity] = useState(1.8);
  const [isBiometricUnlocked, setIsBiometricUnlocked] = useState(false);
  const [appLocked, setAppLocked] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const triggerBiometricUnlock = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setIsBiometricUnlocked(true);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Expense Tracker',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsBiometricUnlocked(true);
      }
    } catch (err) {
      console.log('Biometric error:', err);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const val = await AsyncStorage.getItem('shake_sensitivity');
        if (val) {
          if (val === 'disabled') setShakeSensitivity(0);
          else if (val === '2.0' || val === '1.2') setShakeSensitivity(1.2);
          else if (val === '3.5' || val === '1.8') setShakeSensitivity(1.8);
          else if (val === '5.0' || val === '2.6') setShakeSensitivity(2.6);
          else setShakeSensitivity(parseFloat(val) || 1.8);
        }
        
        const bioEnabled = await AsyncStorage.getItem('biometric_enabled');
        if (bioEnabled === 'true') {
          setAppLocked(true);
          triggerBiometricUnlock();
        } else {
          setIsBiometricUnlocked(true);
        }
      } catch (e) {
        console.log(e);
        setIsBiometricUnlocked(true);
      }
    };
    loadSettings();

    const listener = DeviceEventEmitter.addListener('shake_sensitivity_changed', (val) => {
      if (val === 'disabled') {
        setShakeSensitivity(0);
      } else {
        setShakeSensitivity(parseFloat(val) || 1.8);
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  // Shake Gesture Listener (Delta-based jerk detection)
  useEffect(() => {
    let subscription = null;
    let lastUpdate = 0;
    let lastX = null;
    let lastY = null;
    let lastZ = null;

    if (isAuthenticated && shakeSensitivity > 0) {
      Accelerometer.setUpdateInterval(150); // Sample every 150ms
      subscription = Accelerometer.addListener((data) => {
        const { x, y, z } = data;
        
        if (lastX === null) {
          lastX = x;
          lastY = y;
          lastZ = z;
          return;
        }

        const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
        lastX = x;
        lastY = y;
        lastZ = z;

        if (delta > shakeSensitivity) {
          const now = Date.now();
          if (now - lastUpdate > 1800) { // Throttle to 1 shake per 1.8 seconds
            lastUpdate = now;
            
            // Haptic vibration feedback
            Vibration.vibrate(60);
            
            if (navigationRef.isReady()) {
              console.log('Shake detected! Navigating to AddExpense');
              try {
                navigationRef.navigate('MainTabs', {
                  screen: 'Home',
                  params: { screen: 'AddExpense' },
                });
              } catch (navErr) {
                console.log('Nav error:', navErr);
                navigationRef.navigate('AddExpense');
              }
            }
          }
        }
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isAuthenticated, shakeSensitivity]);

  useEffect(() => {
    const handleSilentUpdates = async () => {
      // 1. Silent background OTA update: downloads quietly without any restart popups!
      try {
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            // Silently fetch update in background — seamlessly applies on next app launch without disturbing user!
            await Updates.fetchUpdateAsync();
          }
        }
      } catch (e) {}

      // 2. Check for latest APK version (highlights in Menu tab if new APK exists)
      try {
        await checkAppVersion(true);
      } catch (e) {}
    };

    handleSilentUpdates();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        handleSilentUpdates();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const setupFCM = async (authToken) => {
      try {
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          }
          await Notifications.setNotificationChannelAsync('expense_tracker_alerts_v2', {
            name: 'Expense Alerts & Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
          });
          await Notifications.setNotificationChannelAsync('expense_tracker_alerts', {
            name: 'Expense Tracker Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
          await Notifications.setNotificationChannelAsync('default', {
            name: 'General Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }

        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          await messaging().subscribeToTopic('all_users');
          console.log('Subscribed to all_users topic!');
          
          if (authToken) {
            const fcmToken = await messaging().getToken();
            console.log('FCM Token:', fcmToken);
            
            // Send token to backend
            try {
              await fetch(`${BASE_URL}/api/update-fcm-token/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Token ${authToken}`,
                },
                body: JSON.stringify({ fcm_token: fcmToken })
              });
              console.log('FCM token sent to backend successfully');
            } catch (apiError) {
              console.log('Error sending FCM token to backend:', apiError);
            }
          }
        }
      } catch (error) {
        console.error("FCM Setup Error:", error);
      }
    };

    let unsubscribe = () => {};
    let notifResponseSub = null;

    try {
      unsubscribe = messaging().onMessage(async remoteMessage => {
        await saveNotification(remoteMessage);
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: remoteMessage.notification?.title || 'Expense Tracker 💡',
              body: remoteMessage.notification?.body || '',
              data: remoteMessage.data || {},
              sound: 'default',
              channelId: 'expense_tracker_alerts_v2',
            },
            trigger: null, // immediate heads-up popup banner and sound!
          });
        } catch (notifErr) {
          console.log('Error showing heads-up notification in foreground:', notifErr);
          Alert.alert(
            remoteMessage.notification?.title || 'New Notification', 
            remoteMessage.notification?.body || JSON.stringify(remoteMessage)
          );
        }
      });

      // Handle background notification tap
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage.notification);
        if (remoteMessage.data?.screen) {
          setTimeout(() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate(remoteMessage.data.screen);
            }
          }, 500);
        }
      });

      // Handle initial notification (app was closed)
      messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage.notification);
          if (remoteMessage.data?.screen) {
            setTimeout(() => {
              if (navigationRef.isReady()) {
                navigationRef.navigate(remoteMessage.data.screen);
              }
            }, 1000); // Wait longer on cold start
          }
        }
      }).catch(err => console.log('getInitialNotification error:', err));

      notifResponseSub = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.screen && navigationRef.isReady()) {
          navigationRef.navigate(data.screen);
        }
      });
    } catch (msgErr) {
      console.log('FCM messaging listener error:', msgErr);
    }

    const checkAuth = async () => {
      try {
        const token = await getToken();
        if (token) {
          setIsAuthenticated(true);
          setupFCM(token);
          scheduleRandomNotifications();
        } else {
          setIsAuthenticated(false);
          setupFCM(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();

    setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (notifResponseSub && notifResponseSub.remove) notifResponseSub.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#F8F9FA' }]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContent}>
          <Logo size={0.7} circle={true} showText={false} />
          <ActivityIndicator size="small" color="#1A73E8" style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  if (appLocked && !isBiometricUnlocked) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#0B0E14' }]}>
        <StatusBar style="light" />
        <View style={styles.loadingContent}>
          <Logo size={0.7} circle={true} showText={false} />
          <Text style={{ color: '#fff', fontSize: 20, marginTop: 28, fontWeight: '700' }}>
            Expense Tracker is Locked
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 }}>
            Authenticate with Fingerprint, Face or Screen Lock
          </Text>
          <TouchableOpacity 
            style={{
              marginTop: 32,
              backgroundColor: '#8B5CF6',
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 24,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#8B5CF6',
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 6
            }}
            onPress={triggerBiometricUnlock}
          >
            <Ionicons name="finger-print" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Unlock App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const linking = {
    prefixes: [
      'expensetracker://',
      'paisamitra://',
      'com.ajay160380.paisamitra://',
      'com.googleusercontent.apps.600331588079-97q2pl2l6impkean30df3qig5t6rl7et://',
    ],
    config: {
      screens: {
        MainTabs: {
          screens: {
            Home: {
              screens: {
                AddExpense: 'add',
                VoiceExpense: 'voice',
                History: 'history',
              },
            },
          },
        },
      },
    },
  };

function AppNavigatorContent({ isAuthenticated, linking, showSplash, setShowSplash }) {
  const { isDark, colors } = useTheme();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={navTheme}
        onStateChange={() => {
          const currentRouteName = navigationRef.getCurrentRoute()?.name;
          if (currentRouteName) {
            analytics.trackScreen(currentRouteName);
          }
        }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: colors.bg },
          }}
        >
          {/* Auth Flow */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

          {/* Main App */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          {/* Legal & System Screens */}
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="NotFound" component={NotFoundScreen} />

          {/* Global Modals (accessible from anywhere) */}
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <CustomAlertModal />

      {/* 💸 Money Burst Splash — Full-Screen Translucent Native Modal */}
      {isAuthenticated && (
        <Modal
          visible={showSplash}
          transparent={true}
          animationType="none"
          statusBarTranslucent={true}
          onRequestClose={() => setShowSplash(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
            <MoneySplashScreen
              onFinish={() => setShowSplash(false)}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigatorContent
            isAuthenticated={isAuthenticated}
            linking={linking}
            showSplash={showSplash}
            setShowSplash={setShowSplash}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingLogo: {
    marginBottom: 16,
  },
  loadingLogoBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSparkle: {
    marginRight: 6,
  },
  loadingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingBrandBg: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  loadingBrandGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // ── Add Button (Center FAB with White Ring) ──
  addBtnContainer: {
    position: 'relative',
    top: Platform.OS === 'ios' ? -18 : -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnWhiteRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  addBtnGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
