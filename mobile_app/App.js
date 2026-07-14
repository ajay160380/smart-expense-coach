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
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from './src/components/Logo';
import { setUnauthorizedHandler } from './src/api/config';
import { getToken } from './src/utils/auth';

// ── Auth Screens ──
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// ── Main Screens ──
import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SavingsGoalsScreen from './src/screens/SavingsGoalsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';

// ── Stack Screens (accessible from tabs) ──
import AIChatScreen from './src/screens/AIChatScreen';
import ExpenseSplitScreen from './src/screens/ExpenseSplitScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import VoiceExpenseScreen from './src/screens/VoiceExpenseScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const GoalsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// ═══════════════════════════════════════════════
// HOME STACK — Dashboard + sub-screens
// ═══════════════════════════════════════════════
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0B0E14' } }}>
      <HomeStack.Screen name="DashboardMain" component={DashboardScreen} />
      <HomeStack.Screen name="AIChat" component={AIChatScreen} />
      <HomeStack.Screen name="VoiceExpense" component={VoiceExpenseScreen} />
      <HomeStack.Screen name="AddExpense" component={AddExpenseScreen} />
      <HomeStack.Screen name="ExpenseSplit" component={ExpenseSplitScreen} />
      <HomeStack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <HomeStack.Screen name="Notifications" component={DashboardScreen} />
    </HomeStack.Navigator>
  );
}

// ═══════════════════════════════════════════════
// GOALS STACK
// ═══════════════════════════════════════════════
function GoalsStackScreen() {
  return (
    <GoalsStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0B0E14' } }}>
      <GoalsStack.Screen name="GoalsMain" component={SavingsGoalsScreen} />
    </GoalsStack.Navigator>
  );
}

// ═══════════════════════════════════════════════
// PROFILE STACK
// ═══════════════════════════════════════════════
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0B0E14' } }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="AIChat" component={AIChatScreen} />
      <ProfileStack.Screen name="Analytics" component={AnalyticsScreen} />
      <ProfileStack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      <ProfileStack.Screen name="ExpenseSplit" component={ExpenseSplitScreen} />
      <ProfileStack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <ProfileStack.Screen name="VoiceExpense" component={VoiceExpenseScreen} />
      <ProfileStack.Screen name="AdminPanel" component={AdminPanelScreen} />
    </ProfileStack.Navigator>
  );
}

// ═══════════════════════════════════════════════
// CUSTOM ADD BUTTON (Center FAB)
// ═══════════════════════════════════════════════
function AddButton({ onPress }) {
  return (
    <View style={styles.addBtnContainer}>
      <LinearGradient
        colors={['#A888FF', '#9333EA']}
        style={styles.addBtnGradient}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </LinearGradient>
    </View>
  );
}

// ═══════════════════════════════════════════════
// MAIN TAB NAVIGATOR
// ═══════════════════════════════════════════════
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f1520',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.05)',
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: '#A888FF',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'analytics' : 'analytics-outline';
          else if (route.name === 'Add') iconName = 'add';
          else if (route.name === 'Goals') iconName = focused ? 'flag' : 'flag-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={route.name === 'Add' ? 28 : 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
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
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}

// ═══════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
        // FORCE FALSE FOR TESTING WELCOME SCREEN
        setIsAuthenticated(false);
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

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0B0E14' },
        }}
      >
        {/* Auth Flow */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Main App */}
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />

        {/* Global Modals (accessible from anywhere) */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0E14',
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

  // ── Add Button ──
  addBtnContainer: {
    position: 'relative',
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A888FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});
