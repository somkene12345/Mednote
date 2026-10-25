import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet } from 'react-native';
import Index from './index';
import SearchPatientNotes from './notes';

const Drawer = createDrawerNavigator();

export default function RootLayout() {
  return (
    <View style={styles.appContainer}>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0F172A',
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.08)',
          },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            letterSpacing: 0.5,
          },
          drawerStyle: {
            backgroundColor: '#0F172A',
            width: 270,
            borderRightWidth: 1,
            borderRightColor: 'rgba(255, 255, 255, 0.08)',
          },
          drawerActiveBackgroundColor: 'rgba(56, 189, 248, 0.15)',
          drawerActiveTintColor: '#38BDF8',
          drawerInactiveTintColor: '#94A3B8',
          drawerLabelStyle: {
            fontSize: 15,
            fontWeight: '600',
          },
        }}
      >
        <Drawer.Screen name="Home" component={Index} options={{ title: 'MedNote' }} />
        <Drawer.Screen name="Search Notes" component={SearchPatientNotes} options={{ title: 'Search Notes' }} />
      </Drawer.Navigator>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Designed by Somkenenna Okechukwu</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  footer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.3,
  },
});
