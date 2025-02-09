import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import emailjs from 'emailjs-com';

/**
 * A screen that allows the user to reset their password.
 *
 * This screen provides functionality for the user to receive a verification code to their
 * registered email address, after a backend check to ensure the account exists. The user can 
 * then input the received code to verify their identity. Upon successful verification, 
 * the user is navigated to the ChangePasswordScreen to update their password.
 *
 * The screen handles email input, verification code generation, sending the
 * verification email, and verifying the entered code against the generated one.
 *
 * @param {object} navigation - The navigation object to navigate to other screens.
 */
export default function ResetPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false); 

    /**
     * Generates a 6-digit verification code and sends it to the user's email,
     * displaying a success alert and logging the code to the console.
     * 
     * The generated code is stored in the component's state.
     * 
     * @return {string} The generated verification code as a string.
     */
    const generateVerificationCode = () => {
        const code = Math.floor(100000 + Math.random() * 900000); 
        setGeneratedCode(code.toString());        
        console.log(`Verification code sent to ${email}: ${code}`);
        alert(`A verification code has been sent to your email: ${email}`);
        return code.toString();
    };

    /**
     * Sends an email using the emailjs library.
     * 
     * This function is used to send a verification email to the user's registered email address.
     * 
     * @param {{ to_email: string, subject: string, message: string }} props - The props object
     * containing the recipient's email address, the subject of the email, and the message body.
     */
    const SendEmail = ({ to_email, subject, message }) => {
        const templateParams = { 
            to_email: to_email, 
            subject: subject,         
            message: message     
        };
    
        emailjs.send('service_ne7rumj', 'template_plf5crk', templateParams, 'mGUrQhxy9KTLxalXv')
        .then((result) => {
            console.log('Email successfully sent!', result.text);
        })
        .catch((error) => {
            console.error('There was an error sending the email:', error.text);
        });
    };

    /**
     * Handles sending a verification code to the user's email.
     * 
     * It first checks if the user has entered an email address. If not, it
     * displays an error message and does not proceed.
     * 
     * Next, it checks if the user is online. If not, it displays an error message
     * and does not proceed.
     * 
     * If the user is online, it sends a POST request to the backend to verify
     * if an account with the given email exists. If the account exists, it
     * generates a verification code using the predefined function and sends it to the user's email.
     * If the account does not exist, it displays an error message.
     * 
     * Throughout the process, it displays a loading indicator and handles any
     * potential errors that may occur.
     */
    const handleSendVerificationCode = async () => {
        if (!email) {
            alert('Please enter your email.');
            return;
        }
        setLoading(true);

        if (!navigator.onLine) {
            alert("Network error. Please check your internet connection.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/verify-user', {  
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),  
            });
    
            const data = await response.json();
    
            if (response.ok && data.exists) {
                const code = generateVerificationCode(); 
    
                SendEmail({
                    to_email: email,
                    subject: 'Password Reset Verification Code',
                    message: `Your verification code is: ${code}`,
                });
    
                setIsCodeSent(true);
            } else if (response.ok && !data.exists) {
                alert('No account found with this email.');
            } else {
                alert('Error verifying user. Please try again.');
            }
        } catch (error) {
            console.error('Error verifying email:', error);
            alert('There was an error verifying the email. Please try again.');
        } finally {
            setLoading(false); 
        }
    };

/**
 * Verifies the user-entered verification code against the generated code.
 * 
 * If the codes match, a success message is displayed, and the user is navigated
 * to the Change Password screen. If the codes do not match, an error message
 * is displayed.
 */
    const handleVerifyCode = () => {
        if (verificationCode === generatedCode) {
            setVerifying(true); 
            setTimeout(() => {
                alert('Code verified! You can now reset your password.');
                setVerifying(false);
                navigation.navigate('Change', {email: email});
            }, 1000); 
        } else {
            alert('Incorrect verification code. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerAndInputContainer}>
                <Text style={styles.header}>
                    Enter the email you registered your account with, and we’ll send you a verification code to get started.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    accessibilityLabel="Email Address Input"
                />
            </View>

            <View style={styles.inputContainer}>
                {isCodeSent && (
                    <TextInput
                        style={styles.codeInput}
                        placeholder="Verification Code"
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="numeric"
                        maxLength={6}
                        accessibilityLabel="Verification Code Input"
                    />
                )}
            </View>

            {!isCodeSent ? (
                loading ? (
                    <ActivityIndicator size="large" color="#64AFF4" />
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleSendVerificationCode}>
                        <Text style={styles.buttonText}>Send Verification Code</Text>
                    </TouchableOpacity>
                )
            ) : (
                verifying ? (
                    <ActivityIndicator size="large" color="#64AFF4" />
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleVerifyCode}>
                        <Text style={styles.buttonText}>Verify Code</Text>
                    </TouchableOpacity>
                )
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
    headerAndInputContainer: {
        width: '60%',
        marginBottom: 25,
        alignItems: 'center',
    },
    header: {
        fontSize: 25,
        marginBottom: 40,
        textAlign: 'center',
    },
    inputContainer: {
        width: '90%',
        marginBottom: 25,
        alignItems: 'center',
    },
    input: {
        width: '90%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#64AFF4',
        borderRadius: 10,
        color: 'grey',
    },
    codeInput: {
        width: '60%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#64AFF4',
        borderRadius: 10,
        color: 'grey',
    },
    button: {
        backgroundColor: '#64AFF4',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        width: '40%',
        borderRadius: 50,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
