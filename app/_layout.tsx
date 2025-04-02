import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet } from 'react-native';
import Index from './index';
import SearchPatientNotes from './notes';

const Drawer = createDrawerNavigator();

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
        }}
      >
        <Drawer.Screen name="Home" component={Index} options={{ title: 'Mednote' }} />
        <Drawer.Screen name="Search Notes" component={SearchPatientNotes} options={{ title: 'Mednote - Search Notes' }} />
      </Drawer.Navigator>
      
      {/* Added footer only - no other changes */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Designed by Somkenenna Okechukwu</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  footerText: {
    fontSize: 14,
    color: '#666'
  }
});
