import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SignupScreen from './view/auth/SignUpScreen';
import LoginScreen from './view/auth/LoginScreen'; 
import ResetPasswordScreen from './view/auth/ResetPasswordScreen';
import HomeScreen from './view/listings/HomeScreen';
import BookmarksScreen from './view/settings/BookmarksScreen';
import ChangePasswordScreen from './view/auth/ChangePasswordScreen';
import EditPreferencesScreen from './view/settings/EditPreferencesScreen';

const Stack = createStackNavigator();

const linking = {
  prefixes: ['http://localhost:8081'],
  config: {
    screens: {
      Signup: '',
      Login: 'login',
      ResetPassword: 'reset',
      Home: 'home',
      Bookmarks: 'bookmarks',
      Change: 'change',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Signup">
        <Stack.Screen 
          name="Signup" 
          component={SignupScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Reset"
          component={ResetPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="Bookmarks"
        component={BookmarksScreen} 
        options={{ headerShown: false }}
        /> 
        <Stack.Screen
          name="Change" 
          component={ChangePasswordScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Edit" 
          component={EditPreferencesScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
