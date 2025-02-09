import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

/**
 * A screen for changing the user's password.
 *
 * This screen displays input fields for the user to enter a new password 
 * and confirm it. It provides validation to ensure the new password meets
 * security criteria, such as minimum length, inclusion of uppercase, lowercase,
 * numerical, and special characters. Upon successful validation, it sends a 
 * request to the backend to update the password for the given email.
 *
 * If the password update is successful, the user is redirected to the LoginScreen.
 * If there are any errors during the process, appropriate error messages are displayed.
 *
 * @param {object} route - Contains routing parameters, including the user's email.
 * @param {object} navigation - Navigation object for redirecting the user.
 */
export default function ChangePasswordScreen({ route, navigation }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const {email} = route.params; 

    /**
     * Changes the user's password.
     *
     * This function validates the new password input to ensure it meets
     * security criteria (length, inclusion of uppercase, lowercase, numerical,
     * and special characters). If validation is successful, it sends a request
     * to the backend to update the password for the given email.
     *
     * If the password update is successful, the user is redirected to the LoginScreen.
     * If there are any errors during the process, appropriate error messages are displayed via alerts.
     */
    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            alert('Please fill in all fields.');
            return;
        }
    
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
    
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters long!');
            return;
        }
    
        if (!/[A-Z]/.test(newPassword)) {
            alert('Password must contain at least one uppercase character!');
            return;
        }
    
        if (!/[a-z]/.test(newPassword)) {
            alert('Password must contain at least one lowercase character!');
            return;
        }
    
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            alert('Password must contain at least one special character!');
            return;
        }
        
        if (!/[0-9]/.test(newPassword)) {
            alert('Password must contain at least one number!');
            return;
        }
    
        setLoading(true);

        if (!navigator.onLine) {
            alert("Network error. Please check your internet connection.");
            setLoading(false);
            return;
        }
    
        try {
            const response = await fetch('http://127.0.0.1:8000/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, new_password: newPassword }),
            });
    
            const data = await response.json();
    
            if (response.ok) {
                alert('Password updated successfully!');
                navigation.navigate('Login'); 
            } else {
                alert(data.detail || 'Failed to update password.');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('There was an error resetting the password. Please try again.');
        } finally {
            setLoading(false);
        }
    };    

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Enter your new password below: </Text>

            <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                accessibilityLabel="New Password Input"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                accessibilityLabel="Confirm Password Input"
            />

            <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={loading}>
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                )}
            </TouchableOpacity>
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
        fontSize: 24,
        marginBottom: 20,
    },
    input: {
        width: '40%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#64AFF4',
        borderRadius: 10,
        marginBottom: 20,
        color: 'grey',
        borderRadius: 10,
    },
    button: {
        backgroundColor: '#64AFF4',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        width: '30%',
        borderRadius: 50,
        marginTop: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
