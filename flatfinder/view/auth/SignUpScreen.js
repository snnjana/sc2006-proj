import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, StatusBar, ActivityIndicator } from 'react-native';
import validator from 'validator';

/**
 * A screen that allows the user to sign up for an account.
 *
 * The screen will display a registration form with an email and password input.
 * When the user submits the form, a new account will be attempted to be created
 * by sending a POST request to the backend server. If the account is created
 * successfully, the user is navigated to the LoginScreen. If the account creation
 * fails, an error message is displayed to the user.
 *
 * @param {object} navigation - A navigation object that contains a function to
 * navigate to the other screens.
 */
export default function SignUpScreen ({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

/**
 * Handles the user signup process.
 *
 * This function validates the signup form input and attempts to create a 
 * new user account by sending a POST request to the backend server. 
 * It performs the following validations:
 * - Checks if the user is online.
 * - Validates the email format and ensures it belongs to an allowed domain.
 * - Confirms that the password and confirm password fields match.
 * - Ensures the password meets security criteria, including minimum length,
 *   and the inclusion of uppercase, lowercase, numerical, and special characters.
 *
 * If the input passes all validations, it sends a POST request to the backend to create the 
 * account. Upon successful account creation, the user is navigated to  
 * LoginScreen. If the account creation fails, an error message is displayed.
 *
 * During the operation, a loading indicator is shown after the button is clicked. 
 * Appropriate alerts are displayed for validation errors or network issues.
 */
  const handleSignup = async () => {
    setLoading(true);

    if (!navigator.onLine) {
      alert("Network error. Please check your internet connection.");
      setLoading(false);
      return;
    }
    
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com'];
    const emailDomain = email.split('@')[1];

    if (!validator.isEmail(email) || !allowedDomains.includes(emailDomain)) {
        alert(`Please enter a valid email from one of the following providers: ${allowedDomains.join(', ')}`);
        setLoading(false);
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        setLoading(false);
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters long!');
        setLoading(false);
        return;
    }

    if (!/[A-Z]/.test(password)) {
        alert('Password must contain at least one uppercase character!');
        setLoading(false);
        return;
    }

    if (!/[a-z]/.test(password)) {
        alert('Password must contain at least one lowercase character!');
        setLoading(false);
        return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        alert('Password must contain at least one special character!');
        setLoading(false);
        return;
    }
    
    if (!/[0-9]/.test(password)) {
        alert('Password must contain at least one number!');
        setLoading(false);
        return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/signup', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              email,
              password,
          }),
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.detail || 'Failed to create account');
      }
      alert('Account created successfully!');
      navigation.navigate('Login');
    } catch (error) {
      alert(`${error.message}`);
    } finally {
      setLoading(false); 
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.header}>Welcome to FlatFinder!</Text>
          <Text style={styles.subHeader}>
            Already have an account? <Text style={styles.link} onPress={() => navigation.navigate('Login')}>Log in</Text>.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />

          <View style={styles.passwordRequirements}>
            <View style={styles.requirementsRow}>
              <Text style={styles.requirementText}>● Use 8 or more characters&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;● One uppercase character&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;● One lowercase character</Text>
            </View>
            <View style={styles.requirementsRow}>
              <Text style={styles.requirementText}>● One special character&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;● One digit</Text>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true}
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create an account</Text>}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By creating an account, you agree to the <Text style={styles.link}>Terms of use</Text> and <Text style={styles.link}>Privacy Policy</Text>.
          </Text>
        </View>
        <Image source={require('../../assets/homepage.jpg')} style={styles.image} />
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollViewContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    width: '50%',
    padding: 20,
  },
  header: {
    fontSize: 30,
    color: '#64AFF4',
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 16,
  },
  subHeader: {
    fontSize: 16,
    marginBottom: 20,
    marginLeft: 16,
  },
  link: {
    color: '#64AFF4',
    textDecorationLine: 'underline',
  },
  input: {
    borderWidth: 1,
    borderColor: '#64AFF4',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    marginLeft: 16,
    width: '80%',
    borderRadius: 10,
    color: 'grey',
  },
  passwordRequirements: {
    marginBottom: 20,
    width: '90%',
  },
  requirementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  requirementText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 16,
  },
  buttonDisabled: {
    backgroundColor: '#96C3F8',
  },
  button: {
    backgroundColor: '#64AFF4',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
    width: '40%',
    marginLeft: 16,
    borderRadius: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 16,
  },
  image: {
    width: '50%',
    height: '100%',
    resizeMode: 'cover',
  },
});
