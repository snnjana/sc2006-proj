import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image, TextInput, Alert, Picker, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = "http://127.0.0.1:8000";

/**
 * This component renders a screen which allows users to view and edit their preferences. 
 * It fetches the user's preferences from the backend, renders a form with the user's 
 * preferences, and allows the user to edit and save their preferences.
 * 
 * It also displays a chat window where the user can communicate with an AI Chatbot, which
 * makes use of the user's preferences retrieved from the backend to generate customised
 * responses. If no preferences are available (default for new account), the AI Chatbot will
 * prompt the user to edit and save their preferences before chatting.
 * 
 * @param {object} navigation - The React Navigation navigation object.
 */
const EditPreferencesScreen = ({ navigation }) => {
    const [editMode, setEditMode] = useState(false);
    const [salary, setSalary] = useState('0');
    const [cpfBalance, setCpfBalance] = useState('0');
    const [hdbType, setHdbType] = useState('');
    const [preferredPrice, setPreferredPrice] = useState('0');
    const [housingLoanType, setHousingLoanType] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [userMessage, setUserMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef(null);

    useEffect(() => {
        /**
         * Retrieves the user's email address from AsyncStorage and fetches the user's
         * preferences from the backend if the email address exists.
         */
        const loadUserEmail = async () => {
            const email = await AsyncStorage.getItem('userEmail');
            if (email) {
                setUserEmail(email);
                fetchUserData(email);
            }
        };
        loadUserEmail();
    }, []);

    /**
     * Fetches the user's preferences from the backend and stores it in the component's state.
     * 
     * The function makes a GET request to the backend server with the user's email as a parameter.
     * If the request is successful and the user exists, the function sets the component's state
     * with the user's preferences. If the user does not exist, it throws an error.
     * 
     * @param {string} email - The user's email address.
     */
    const fetchUserData = async (email) => {
        try {
            const response = await fetch(`${BACKEND_URL}/user/preferences/${email}`);
            if (!response.ok) throw new Error("User not found");
            const userData = await response.json();
            setSalary(userData.salary.toString());
            setCpfBalance(userData.cpf_balance.toString());
            setHdbType(userData.hdb_type);
            setPreferredPrice(userData.preferred_price.toString());
            setHousingLoanType(userData.housing_loan_type);
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    };

    const isValidDecimal = (value) => /^\d+(\.\d{1,2})?$/.test(value);

    /**
     * Validates the user's preferences and saves it to the backend if all fields
     * are valid. If any of the fields are invalid, it sets an error message and
     * returns without saving the preferences or making the backend request.
     * 
     * Validation rules:
     * - Salary must be a positive number with up to 2 decimal places.
     * - CPF Balance must be a positive number with up to 2 decimal places.
     * - Preferred Price must be a positive number with up to 2 decimal places.
     * - HDB Loan is only allowed if salary is less than or equal to 7000.
     * - Preferred price must be $200,000 or more.
     * 
     * If the user's preferences are valid, it makes a POST request to the backend
     * server with the user's preferences. If the request is successful, it displays
     * a success alert and sets editMode to false. If the request fails, it displays
     * an error alert and logs the error to the console.
     */
    const handleSavePreferences = async () => {
        setErrorMessage('');

        if (!salary || !cpfBalance || !hdbType || !preferredPrice || !housingLoanType) {
            setErrorMessage('Please fill out all fields.');
            return;
        }

        if (housingLoanType === 'HDB Housing Loan' && parseFloat(salary) > 7000) {
            setErrorMessage('HDB Loan is only allowed if salary is less than or equal to 7000.');
            return;
        }

        if (!isValidDecimal(preferredPrice) || parseFloat(preferredPrice) < 200000) {
            setErrorMessage('Preferred price must be $200,000 or more.');
            return;
        }

        if (!isValidDecimal(salary) || parseFloat(salary) <= 0) {
            setErrorMessage('Salary must be a positive number with up to 2 decimal places.');
            return;
        }
        if (!isValidDecimal(cpfBalance) || parseFloat(cpfBalance) <= 0) {
            setErrorMessage('CPF Balance must be a positive number with up to 2 decimal places.');
            return;
        }
        if (!isValidDecimal(preferredPrice) || parseFloat(preferredPrice) <= 0) {
            setErrorMessage('Preferred Price must be a positive number with up to 2 decimal places.');
            return;
        }

        const updatedData = {
            salary: parseFloat(salary),
            cpf_balance: parseFloat(cpfBalance),
            hdb_type: hdbType,
            preferred_price: parseFloat(preferredPrice),
            housing_loan_type: housingLoanType,
        };

        try {
            const response = await fetch(`${BACKEND_URL}/user/preferences/${userEmail}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) throw new Error("Failed to update preferences");

            Alert.alert('Success', 'Preferences updated successfully!');
            setEditMode(false);
        } catch (error) {
            console.error("Error updating user data:", error);
            Alert.alert('Error', 'Failed to update preferences.');
        }
    };
    
    /**
     * Formats a given amount as a string with commas separating
     * the thousands, millions, etc.
     * @param {number} amount - The amount to format
     * @returns {string} The formatted amount
     */
    const formatAmount = (amount) => {
        return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    
    /**
     * Determines the eligibility for housing grants based on the user's salary and HDB type.
     * 
     * The function checks if the user's salary qualifies them for the HDB Singles Grant
     * and/or the Enhanced CPF Housing Grant. It returns a message indicating the grants
     * the user is eligible for and the total grant amount.
     * 
     * @returns {string} A message indicating the eligible grants and their total amount,
     *                   or a message stating the user is not eligible for any grants.
     */
    const checkGrantEligibility = () => {
        if (parseFloat(salary) <= 7000) {
            const singlesGrant = (hdbType === "5-Room" || hdbType === "Executive") ? 25000 : 40000;
            if (parseFloat(salary) <= 4500) {
                const enhancedGrant = 60000;
                const totalGrant = singlesGrant + enhancedGrant;
                return `Eligible for: HDB Singles Grant and Enhanced CPF Housing Grant. \nTotal Amount: $${formatAmount(totalGrant)}`;
            } else {
                return `Eligible for: HDB Singles Grant. \nAmount: $${formatAmount(singlesGrant)}`;
            }
        }
        return "Not eligible for any grants.";
    };    

    const grantEligibilityMessage = checkGrantEligibility();

    const examplePrompts = [
        "What HDB type is suitable for me given my preferences?",
        "Which location would be most applicable to my financial needs?"
    ];    

    /**
     * Sends a message to the backend chatbot server and updates the chat messages state accordingly.
     * Ensures that the chat automatically scrolls to the bottom with every new response.
     * 
     * @param {string} [message = userMessage] - The message to send to the backend server
     */
    const handleSendMessage = async (message = userMessage) => {
        if (!message.trim()) return;

        const newMessage = { text: message, sender: 'user' };
        const updatedChatMessages = [...chatMessages, newMessage]; 
        setChatMessages(updatedChatMessages);
        setUserMessage('');
        setLoading(true); 

        const userPreferences = {
            salary: salary,
            cpf_balance: cpfBalance,
            hdb_type: hdbType,
            preferred_price: preferredPrice,
            housing_loan_type: housingLoanType
        };

        try {
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    user_input: message, 
                    user_preferences: userPreferences, 
                    history: updatedChatMessages 
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setChatMessages([...updatedChatMessages, { text: data.response, sender: 'bot' }]);
                scrollViewRef.current.scrollToEnd({ animated: true });
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setLoading(false); 
        }
    };

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [chatMessages]);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Image 
                source={require('../../assets/hdb.jpg')} 
                style={styles.backdrop} 
            />

            <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.navigate('Home')}
            >
                <View style={styles.circleButton}>
                    <Image 
                        source={require('../../assets/homebutton.png')} 
                        style={styles.icon} 
                    />
                </View>
                <Text style={styles.backText}>Back to Home</Text>
            </TouchableOpacity>

            <View style={styles.contentNoBox}>
                <Text style={styles.descriptionText}>
                    Use our intuitive Property Search Tool to discover the perfect Resale HDB! With our vast database, finding your dream property has never been easier.
                </Text>

                <View style={styles.dottedBorder}>
                    <View style={styles.inlineErrorContainer}>
                        <TouchableOpacity
                            style={styles.editPreferencesButton}
                            onPress={() => {
                                if (editMode) {
                                    handleSavePreferences();  
                                } else {
                                    setEditMode(true);  
                                }
                            }}
                        >
                            <Text style={styles.editText}>
                                {editMode ? "Save Preferences" : "Edit Preferences"}
                            </Text>
                        </TouchableOpacity>

                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                    </View>

                    <View style={styles.rowContainer}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Monthly Salary</Text>
                            <TextInput
                                style={styles.input}
                                value={salary === '0' ? '' : salary.toString()} 
                                onChangeText={setSalary}
                                placeholder="Enter Monthly Salary"
                                keyboardType="numeric"
                                editable={editMode}
                            />

                            <Text style={styles.label}>CPF OA Balance</Text>
                            <TextInput
                                style={styles.input}
                                value={cpfBalance === '0' ? '' : cpfBalance.toString()} 
                                onChangeText={setCpfBalance}
                                placeholder="Enter CPF OA Balance"
                                keyboardType="numeric"
                                editable={editMode}
                            />

                            <Text style={styles.label}>HDB Type</Text>
                            <View style={styles.dropdownContainer}>
                                <Picker
                                    selectedValue={hdbType}
                                    onValueChange={(itemValue) => setHdbType(itemValue)}
                                    style={styles.dropdown}
                                    enabled={editMode}
                                >
                                    <Picker.Item label="Select HDB Type" value="" />
                                    <Picker.Item label="1-Room" value="1-Room" />
                                    <Picker.Item label="2-Room" value="2-Room" />
                                    <Picker.Item label="3-Room" value="3-Room" />
                                    <Picker.Item label="4-Room" value="4-Room" />
                                    <Picker.Item label="5-Room" value="5-Room" />
                                    <Picker.Item label="Executive" value="Executive" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.column}>
                            <Text style={styles.label}>Preferred Price</Text>
                            <TextInput
                                style={styles.input}
                                value={preferredPrice === '0' ? '' : preferredPrice.toString()}
                                onChangeText={setPreferredPrice}
                                placeholder="Enter Preferred Price"
                                keyboardType="numeric"
                                editable={editMode}
                            />

                            <Text style={styles.label}>Housing Loan Type</Text>
                            <View style={styles.dropdownContainer}>
                                <Picker
                                    selectedValue={housingLoanType}
                                    onValueChange={(itemValue) => setHousingLoanType(itemValue)}
                                    style={styles.dropdown}
                                    enabled={editMode}
                                >
                                    <Picker.Item label="Select Housing Loan Type" value="" />
                                    <Picker.Item label="HDB Housing Loan" value="HDB Housing Loan" />
                                    <Picker.Item label="DBS 5 Year Fixed Package" value="DBS 5 Year Fixed Package" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    {/* Grant Eligibility Message */}
                    <View style={styles.grantContainer}>
                        <Text style={styles.grantText}>Grant Eligibility:</Text>
                        <Text style={styles.grantDetails}>{grantEligibilityMessage}</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={styles.chatButton}
                onPress={() => setChatOpen(!chatOpen)}
            >
                <Image source={require('../../assets/chat-icon.png')} style={styles.chatIcon} />
            </TouchableOpacity>

            {chatOpen && (
                <View style={styles.chatWindow}>
                    <ScrollView 
                        style={styles.messagesContainer} 
                        ref={scrollViewRef}
                    >
                        <Text style={styles.botMessage}>
                            Hi, welcome to FlatFinder. I'm your personal AI assistant, here to guide you through your flat finding process! Here are some prompts you can try out to get started:
                            {"\n"}                         
                            {examplePrompts.map((prompt, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.promptButton}
                                    onPress={() => handleSendMessage(prompt)}
                                >
                                    {prompt}
                                    {index < examplePrompts.length - 1 ? '\n' : ''}
                                </TouchableOpacity>
                            ))}
                        </Text>

                        {chatMessages.map((message, index) => (
                            <Text
                                key={index}
                                style={message.sender === 'user' ? styles.userMessage : styles.botMessage}
                            >
                                {message.text}
                            </Text>
                        ))}
                        {loading && (
                            <Text style={styles.loadingMessage}>Response is loading...</Text>
                        )}
                    </ScrollView>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            value={userMessage}
                            onChangeText={setUserMessage}
                        />
                        <TouchableOpacity onPress={() => handleSendMessage(userMessage)} style={styles.sendButton}>
                            <Text style={styles.sendButtonText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    chatButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#64AFF4',
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    chatIcon: {
        width: 24,
        height: 24,
        tintColor: 'white',
    },
    chatWindow: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 400,
        height: 450,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 9,
    },
    messagesContainer: { 
        flex: 1, 
        padding: 5 
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#64AFF4',
        color: 'white',
        padding: 8,
        borderRadius: 15,
        marginBottom: 5,
        maxWidth: '80%',
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#ECECEC',
        color: 'black',
        padding: 8,
        borderRadius: 15,
        marginBottom: 5,
        maxWidth: '80%',
    },
    loadingMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#f0f0f0',
        color: '#888',
        padding: 8,
        borderRadius: 15,
        marginBottom: 5,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
    },
    sendButton: {
        backgroundColor: '#64AFF4',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginLeft: 5,
        marginRight: 10,        
    },
    sendButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    backdrop: {
        width: '100%',
        height: 220, 
        position: 'absolute',
    },
    backButton: {
        position: 'absolute',
        top: 25, 
        left: 28, 
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
    },
    circleButton: {
        width: 50, 
        height: 50, 
        borderRadius: 25, 
        backgroundColor: '#fff', 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 5, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    backText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    icon: {
        width: 35, 
        height: 35, 
    },
    contentNoBox: {
        marginTop: 250,
    },
    descriptionText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#555',
        marginBottom: 10,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    inlineErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    editPreferencesButton: {
        marginTop: 3,
        marginBottom: 10,
    },
    editText: {
        color: '#64AFF4',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        marginLeft: 15,
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    column: {
        flex: 1,
        marginHorizontal: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 1,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
        width: '100%',
        marginVertical: 15,
    },
    dropdownContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
        marginVertical: 15,
    },
    dropdown: {
        flex: 1,
        width: '100%',
    },
    dottedBorder: {
        borderWidth: 2,
        borderColor: '#64AFF4',
        borderRadius: 10,
        borderStyle: 'dotted',
        padding: 15,
        marginTop: 20,
        width: '80%',  
        alignSelf: 'center',
    },
    grantContainer: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f0f8ff',
        borderRadius: 10,
    },
    grantText: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 5,
    },
    grantDetails: {
        fontSize: 14,
        color: '#333',
    },
    promptButton: {
        backgroundColor: '#fff',
        borderRadius: 5,
        marginVertical: 5,
        padding: 5,
    },
});

export default EditPreferencesScreen;
