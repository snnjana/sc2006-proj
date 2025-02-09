import firebase from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
//@ts-ignore
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';
import { initializeApp } from "firebase/app"; 
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
    apiKey: "AIzaSyASHnZNUIigWdZlZhDlgkmyMT3qi9Jxcyc",
    authDomain: "flatfinder-6e1c7.firebaseapp.com",
    projectId: "flatfinder-6e1c7",
    storageBucket: "flatfinder-6e1c7.appspot.com",
    messagingSenderId: "999760386504",
    appId: "1:999760386504:web:a271891422a3bf025fc8fd",
    measurementId: "G-FYJDQ27NS4"
};

const app = initializeApp(firebaseConfig);
initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const auth = getAuth(app);
export { auth, app };