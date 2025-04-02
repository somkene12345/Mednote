import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from "expo-router";
import Index from './index';
import SearchPatientNotes from './notes';

const Drawer = createDrawerNavigator();

function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Designed by Somkenenna Okechukwu</Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={{
          drawerStyle: {
            backgroundColor: '#fff',
            width: 250,
          },
          headerShown: false
        }}
      >
        <Drawer.Screen name="Home" component={Index} options={{ title: 'Mednote' }} />
        <Drawer.Screen name="Search Notes" component={SearchPatientNotes} options={{ title: 'Mednote - Search Notes' }} />
      </Drawer.Navigator>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    height: 50,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  footerText: {
    fontSize: 14,
    color: '#666'
  }
});
