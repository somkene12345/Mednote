import { createDrawerNavigator } from '@react-navigation/drawer';
import { useColorScheme, View, Text, StyleSheet } from 'react-native';
import Index from './index';
import SearchPatientNotes from './notes';

const Drawer = createDrawerNavigator();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeColors = {
    background: isDark ? '#121212' : '#F4F6F9',
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#E2E8F0' : '#1E293B',
    primary: '#1D4ED8',
    border: isDark ? '#2D2D2D' : '#E2E8F0',
    footerText: isDark ? '#94A3B8' : '#64748B',
  };

  return (
    <View style={[styles.appContainer, { backgroundColor: themeColors.background }]}>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={{
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
          drawerStyle: {
            backgroundColor: themeColors.surface,
            width: 270,
            borderRightWidth: 1,
            borderRightColor: themeColors.border,
          },
          drawerActiveBackgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(29, 78, 216, 0.1)',
          drawerActiveTintColor: '#1D4ED8',
          drawerInactiveTintColor: themeColors.text,
          drawerLabelStyle: {
            fontSize: 15,
            fontWeight: '500',
          },
        }}
      >
        <Drawer.Screen name="Home" component={Index} options={{ title: 'MedNote' }} />
        <Drawer.Screen name="Search Notes" component={SearchPatientNotes} options={{ title: 'Search Notes' }} />
      </Drawer.Navigator>

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
