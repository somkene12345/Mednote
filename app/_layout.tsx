import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useColorScheme, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigationState } from '@react-navigation/native';
import Index from './index';
import SearchPatientNotes from './notes';

const Drawer = createDrawerNavigator();

// Custom Floating Rounded Bottom Bar for Narrow Mobile Portrait Mode
function FloatingNavBar({ navigation }: { navigation: any }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Get current active route to highlight the correct icon
  const state = useNavigationState((state) => state);
  const currentRouteName = state?.routes[state.index]?.name;

  const bgStyle = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const activeColor = '#1D4ED8';

  return (
    <View style={styles.floatingBarContainer}>
      <View style={[styles.floatingBar, { backgroundColor: bgStyle, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
        
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons
            name={currentRouteName === 'Home' ? 'medical' : 'medical-outline'}
            size={22}
            color={currentRouteName === 'Home' ? activeColor : textColor}
          />
          <Text style={[styles.navText, { color: currentRouteName === 'Home' ? activeColor : textColor }]}>
            MedNote
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Search Notes')}
        >
          <Ionicons
            name={currentRouteName === 'Search Notes' ? 'search' : 'search-outline'}
            size={22}
            color={currentRouteName === 'Search Notes' ? activeColor : textColor}
          />
          <Text style={[styles.navText, { color: currentRouteName === 'Search Notes' ? activeColor : textColor }]}>
            Search Notes
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

export default function RootLayout() {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Detect if device is in narrow mobile portrait mode (e.g., Z Fold folded portrait)
  const isMobilePortrait = width < 600 && height > width;

  const themeColors = {
    background: isDark ? '#121212' : '#F4F6F9',
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#E2E8F0' : '#1E293B',
    border: isDark ? '#2D2D2D' : '#E2E8F0',
    footerText: isDark ? '#94A3B8' : '#64748B',
  };

  return (
    <View style={[styles.appContainer, { backgroundColor: themeColors.background }]}>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={({ navigation }) => ({
          headerStyle: {
            backgroundColor: themeColors.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          },
          headerTintColor: themeColors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          // If in mobile portrait, disable drawer gesture/swipe and hide sidebar completely
          swipeEnabled: !isMobilePortrait,
          drawerType: isMobilePortrait ? 'front' : 'slide',
          drawerStyle: {
            backgroundColor: themeColors.surface,
            width: isMobilePortrait ? 0 : 270,
            borderRightWidth: isMobilePortrait ? 0 : 1,
            borderRightColor: themeColors.border,
          },
          drawerActiveBackgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(29, 78, 216, 0.1)',
          drawerActiveTintColor: '#1D4ED8',
          drawerInactiveTintColor: themeColors.text,
          drawerLabelStyle: {
            fontSize: 15,
            fontWeight: '500',
          },
        })}
      >
        <Drawer.Screen name="Home" component={Index} options={{ title: 'MedNote' }} />
        <Drawer.Screen name="Search Notes" component={SearchPatientNotes} options={{ title: 'Search Notes' }} />
      </Drawer.Navigator>

      {/* Render the floating rounded nav bar ONLY on narrow mobile portrait screens */}
      {isMobilePortrait && <FloatingNavBar navigation={useNavigationState ? require('@react-navigation/native').useNavigation() : null} />}

      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <Text style={[styles.footerText, { color: themeColors.footerText }]}>
          Designed by Somkenenna Okechukwu
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  floatingBarContainer: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  floatingBar: {
    flexDirection: 'row',
    width: '75%',
    maxWidth: 280,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  footer: {
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
