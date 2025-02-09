import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../../firebase.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';

    /**
     * A screen that allows the user to log in to their account.
     *
     * This screen will display a login form with an email and password input.
     * When the user submits the form, the screen will attempt to log in to
     * the user's account using the provided email and password by sending
     * a POST request to the backend server and creating a custom token for the user,
     * which is stored in AsyncStorage.
     *
     * If the login is successful, the user is navigated to the Home screen.
     * If the login fails, an error message is displayed to the user.
     */
export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false); 
    const [showPassword, setShowPassword] = useState(false);

    /**
     * Logs in the user by authenticating their email and password with Firebase Authentication and then
     * uses the returned user credential to obtain a custom token from the backend. The custom token is
     * then stored in AsyncStorage and used to sign in the user with the custom token.
     *
     * If the login is successful, the user is navigated to the Home screen. If the login fails, an
     * error message is displayed to the user.
     */
    const handleLogin = async () => {
        setLoading(true); 
        setErrorMessage('');
        try {
            if (!navigator.onLine) {
                alert("Network error. Please check your internet connection.");
                setLoading(false);
                return;
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            if (userCredential) {
                const response = await fetch('http://127.0.0.1:8000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    const { token } = data;
                    await AsyncStorage.setItem('authToken', token);
                    await AsyncStorage.setItem('userEmail', email); 
                    await signInWithCustomToken(auth, token);
                    alert("Login successful!");
                    navigation.navigate('Home');
                } else {
                    setErrorMessage(data.detail);
                }
            }
        } catch (error) {
            alert("Failed to login. Please check your email and password.");
        } finally {
            setLoading(false); 
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Log in</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    accessibilityLabel="Email Address Input"
                />

                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}  
                    />
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)} 
                    >
                        <Icon
                            name={showPassword ? 'eye' : 'eye-slash'} 
                            size={20}
                            color="#64AFF4"
                            style={styles.eyeIcon}
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.subHeader}>
                    Forgot your password?{' '}
                    <Text
                        style={styles.link}
                        onPress={() => navigation.navigate('Reset')}
                    >
                        Reset your password.
                    </Text>
                </Text>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#64AFF4" />
            ) : (
                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 40,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    inputContainer: {
        width: '35%',
        marginBottom: 25,
    },
    input: {
        width: '100%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#64AFF4',
        borderRadius: 10,
        marginBottom: 15,
        color: 'grey',
    },
    passwordContainer: {
        width: '100%',
    },
    eyeIcon: {
        position: 'absolute',
        right: 10,
        bottom: 24,
    },
    subHeader: {
        color: '#000',
        marginTop: 10,
    },
    link: {
        color: '#64AFF4',
        textDecorationLine: 'underline',
    },
    button: {
        backgroundColor: '#64AFF4',
        padding: 15,
        borderRadius: 40,
        alignItems: 'center',
        width: '30%',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
