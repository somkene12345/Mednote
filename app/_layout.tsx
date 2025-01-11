import { createDrawerNavigator } from '@react-navigation/drawer';
import { Stack } from "expo-router";
import Index from './index'; // Assuming your main page is `index.tsx`
import SearchPatientNotes from './notes'; // Assuming your search notes page is `notes.tsx`

const Drawer = createDrawerNavigator();

export default function RootLayout() {
  return (
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
  );
}
