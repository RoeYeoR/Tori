import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nManager } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { useNotifications } from './src/hooks/useNotifications';

// Disable Firebase v22 warnings for now
LogBox.ignoreLogs([
  'NOBRIDGE',
  '(NOBRIDGE) WARN', 
  'This method is deprecated',
  'React Native Firebase namespaced API',
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
  'Please use `getApp()`',
  'Please use `collection()`',
  'Please use `doc()`',
  'Please use `Timestamp`',
  'Please use `orderBy()`',
  'Please use `where()`',
]);

// Enable RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Set up background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

// Auth Screens
import Welcome from "./src/screens/auth/Welcome";
import Login from "./src/screens/auth/Login";
import Signup from "./src/screens/auth/Signup";
import Verification from "./src/screens/auth/Verification";
import Resetpass from "./src/screens/auth/Resetpass";
import AdminPanel from './src/screens/auth/AdminPanel';

// Main Screen
import Home from "./src/screens/Home";

// Business Screens
import BusinessDashboard from "./src/screens/business/BusinessDashboard";
import BusinessCalendar from "./src/screens/business/BusinessCalendar";
import BusinessCustomers from "./src/screens/business/BusinessCustomers";
import BusinessStats from "./src/screens/business/BusinessStats";
import BusinessSettings from "./src/screens/business/BusinessSettings";
import BusinessSignup from "./src/screens/business/BusinessSignup";
import BusinessProfileSetup from "./src/screens/business/BusinessProfileSetup";
import BusinessServicesSetup from "./src/screens/business/BusinessServicesSetup";
import BusinessScheduleSetup from "./src/screens/business/BusinessScheduleSetup";
import BusinessLogin from './src/screens/business/BusinessLogin';

// Appointment Screens
import NewAppointment from "./src/screens/appointments/NewAppointment";
import EditAppointment from "./src/screens/appointments/EditAppointment";
import RescheduleAppointment from "./src/screens/RescheduleAppointment";

// Customer Screens
import CustomerDetails from "./src/screens/customers/CustomerDetails";
import EditCustomer from "./src/screens/customers/EditCustomer";

// Other Screens
import Profile from './src/screens/Profile';
import MyAppointments from './src/screens/MyAppointments';
import Saved from './src/screens/Saved';
import PersonalDetails from './src/screens/PersonalDetails';
import NotificationSettings from './src/screens/NotificationSettings';
import About from './src/screens/About';
import FullListScreen from './src/screens/FullListScreen';
import QuickAppointments from './src/screens/QuickAppointments';
import Map from './src/screens/Map';


// Components
import BusinessSidebar from "./src/components/BusinessSidebar";
import SalonDetails from "./src/components/salons/SalonDetails";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [hideSplashScreen, setHideSplashScreen] = React.useState(true);
  const navigationRef = React.useRef();

  const [fontsLoaded, error] = useFonts({
    "Assistant-ExtraLight": require("./src/assets/fonts/Assistant-ExtraLight.ttf"),
    "Assistant-Regular": require("./src/assets/fonts/Assistant-Regular.ttf"),
    "Assistant-Bold": require("./src/assets/fonts/Assistant-Bold.ttf"),
  });

  // Set up notifications
  useNotifications(navigationRef.current);

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#fff" }
      }}
    >
      {/* Auth Screens */}
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="Verification" component={Verification} />
      <Stack.Screen name="Resetpass" component={Resetpass} />
      <Stack.Screen 
        name="AdminPanel" 
        component={AdminPanel} 
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Admin Panel',
          headerStyle: {
            backgroundColor: '#E3F2FD',
          },
          headerTitleStyle: {
            fontFamily: "Assistant-SemiBold",
          },
        }}
      />

      {/* Main Screen */}
      <Stack.Screen name="Home" component={Home} />

      {/* Business Screens */}
      <Stack.Screen name="BusinessDashboard" component={BusinessDashboard} />
      <Stack.Screen name="BusinessCalendar" component={BusinessCalendar} />
      <Stack.Screen name="BusinessCustomers" component={BusinessCustomers} />
      <Stack.Screen name="BusinessStats" component={BusinessStats} />
      <Stack.Screen name="BusinessSettings" component={BusinessSettings} />
      <Stack.Screen name="BusinessSignup" component={BusinessSignup} />
      <Stack.Screen name="BusinessProfileSetup" component={BusinessProfileSetup} />
      <Stack.Screen name="BusinessServicesSetup" component={BusinessServicesSetup} />
      <Stack.Screen name="BusinessScheduleSetup" component={BusinessScheduleSetup} />
      <Stack.Screen
        name="BusinessLogin"
        component={BusinessLogin}
        options={{
          headerShown: false,
        }}
      />

      {/* Appointment Screens */}
      <Stack.Screen name="NewAppointment" component={NewAppointment} />
      <Stack.Screen name="EditAppointment" component={EditAppointment} />
      <Stack.Screen name="RescheduleAppointment" component={RescheduleAppointment} />

      {/* Customer Screens */}
      <Stack.Screen name="CustomerDetails" component={CustomerDetails} />
      <Stack.Screen name="EditCustomer" component={EditCustomer} />

      {/* Other Screens */}
      <Stack.Screen name="SalonDetails" component={SalonDetails} />
      <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
      <Stack.Screen name="MyAppointments" component={MyAppointments} options={{ headerShown: false }} />
      <Stack.Screen name="Saved" component={Saved} options={{ headerShown: false }} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetails} options={{ headerShown: false }} />
      <Stack.Screen name="QuickAppointments" component={QuickAppointments} options={{ headerShown: false }} />
      <Stack.Screen name="Map" component={Map} options={{ headerShown: false }} />

      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="About"
        component={About}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FullList" 
        component={FullListScreen}
        options={{ 
          headerShown: true,
          headerBackVisible: true,
          headerTitle: "",
          headerTitleStyle: {
            fontFamily: "Assistant-Bold",
          },
        }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  const navigationRef = React.useRef();

  return (
    <NavigationContainer ref={navigationRef}>
      <GestureHandlerRootView style={styles.container}>
        <AppNavigator />
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});