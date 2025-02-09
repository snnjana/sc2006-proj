import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import images from '../../backend/data/propertyimages.json';
import locationIcon from '../../assets/location-icon.png';
import priceIcon from '../../assets/price-icon.png';
import areaIcon from '../../assets/area-icon.png';
import typeIcon from '../../assets/type-icon.png';

const BACKEND_URL = "http://127.0.0.1:8000";

/**
 * This component renders a screen that displays all the HDB listings
 * that the user has bookmarked. If the user is in edit mode, they can
 * delete a bookmarked listing by pressing the delete button.
 * 
 * The component fetches the user's saved listings from the backend (Firestore) when
 * the component is mounted. It also fetches the assigned images for each
 * listing from the backend and stores them in AsyncStorage.
 * 
 * The component renders a back button in the top left corner of the screen
 * that navigates back to the HomeScreen when pressed.
 * 
 * The component renders a "Done" or "Edit" button in the top right corner
 * of the screen depending on whether the user is in edit mode or not. When
 * the button is pressed, it toggles the user's edit mode.
 * 
 * The component renders a scrollable list of all the user's bookmarked
 * listings. Each listing is rendered as a card with an image, address,
 * price, floor area, and flat type. If the user is in edit mode, a delete
 * button is rendered below each listing.
 * 
 * When the user presses the delete button, the component makes a POST
 * request to the backend to toggle the listing's saved status. If the
 * request is successful, the component reloads the user's bookmarked
 * listings.
 * 
 * @param {object} navigation - The React Navigation navigation object.
 */
const BookmarksScreen = ({ navigation }) => {
    const [bookmarkedListings, setBookmarkedListings] = useState([]);
    const [assignedImages, setAssignedImages] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);

    useFocusEffect(
        useCallback(() => {
            const getEmailFromStorage = async () => {
                const email = await AsyncStorage.getItem('userEmail');
                setLoggedInUser(email);
                if (email) {
                    await loadUserSavedListings(email);
                }
            };
            getEmailFromStorage();
        }, [])
    );

    /**
     * Loads the user's saved listings and the assigned images from AsyncStorage.
     * If a listing does not have an assigned image, it logs an error to the console.
     * If the function fails, it displays an alert with the error message.
     * @param {string} email - The user's email address.
     */
    const loadUserSavedListings = async (email) => {
        try {
            const userListings = await fetchSavedListings(email);
            setBookmarkedListings(userListings);
    
            let savedImages = await AsyncStorage.getItem('globalAssignedImages');
            let assignedImages = savedImages ? JSON.parse(savedImages) : {};
    
            const updatedImages = { ...assignedImages };
    
            userListings.forEach((listing) => {
                const addressKey = listing.address; 
                if (!assignedImages[addressKey]) {
                    console.error(`Missing image for ${addressKey}.`);
                }
            });
            setAssignedImages(updatedImages);
        } catch (error) {
            alert(`Error loading saved listings and images: ${error}`);
        }
    };

    /**
     * Fetches and returns the list of saved listings for the given user email.
     * 
     * The function makes a GET request to the backend's /user/saved-listings endpoint
     * to retrieve the user's saved listings. It also loads and updates the assigned
     * images for each listing from AsyncStorage. If a listing does not have an 
     * assigned image, it randomly selects an available image index and assigns it. 
     * The updated list of assigned images is stored back in AsyncStorage.
     * 
     * If the request fails or an error occurs, an alert is shown and an empty array is returned.
     * 
     * @param {string} email - The user's email address.
     * @returns {Promise<Array>} A promise that resolves with the array of saved listings.
     */
    const fetchSavedListings = async (email) => {
        try {
            const response = await fetch(`${BACKEND_URL}/user/saved-listings/${email}`);
            if (!response.ok) throw new Error('Failed to fetch listings');
            
            const listings = await response.json();
     
            let savedImages = await AsyncStorage.getItem('globalAssignedImages');
            let assignedImages = savedImages ? JSON.parse(savedImages) : {};
             
            const usedIndices = new Set(Object.values(assignedImages));
            const updatedImages = { ...assignedImages };
    
            listings.forEach((listing) => {
                const addressKey = listing.address; 
                if (!updatedImages[addressKey]) {
                    let randomIndex;
                    do {
                        randomIndex = Math.floor(Math.random() * images.length);
                    } while (usedIndices.has(randomIndex)); 
                    updatedImages[addressKey] = randomIndex;
                    usedIndices.add(randomIndex); 
                }
            });
     
            await AsyncStorage.setItem('globalAssignedImages', JSON.stringify(updatedImages));
    
            return listings;
        } catch (error) {
            alert(`Error fetching saved listings: ${error}`);
            return [];
        }
    };

    /**
     * Toggles the saved status of a listing for the current user.
     * 
     * The function takes the listing to toggle as a parameter.
     * It makes a POST request to the backend's /user/saved-listings endpoint
     * to toggle the saved status of the listing. If the request is successful,
     * it reloads the user's saved listings. If the request fails, an alert is shown.
     * 
     * @param {Object} listing - The listing to toggle.
     */
    const toggleSaveListing = async (listing) => {
        try {
            const response = await fetch(`${BACKEND_URL}/user/saved-listings/${loggedInUser}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(listing)
            });
            if (!response.ok) throw new Error('Failed to toggle listing');

            loadUserSavedListings(loggedInUser);
        } catch (error) {
            alert(`Error toggling saved listing: ${error.message}`);
            Alert.alert("Error", "Unable to toggle listing.");
        }
    };

    /**
     * Toggles the edit mode of the BookmarksScreen component.
     * 
     * In edit mode, the component displays a red delete button on each listing card
     * that allows the user to remove the listing from their saved listings. When
     * the user clicks the "Done" button, the component exits edit mode and the
     * delete buttons disappear. When the user clicks the "Edit" button, the component
     * enters edit mode and the delete buttons reappear.
     */
    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    return (
        <View style={styles.container}>
            <Image source={require('../../assets/hdb.jpg')} style={styles.backdrop} />
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
                <View style={styles.circleButton}>
                    <Image source={require('../../assets/homebutton.png')} style={styles.icon} />
                </View>
                <Text style={styles.backText}>Back to Home</Text>
            </TouchableOpacity>

            <View style={styles.content}>
                <Text style={styles.bookmarkedTitle}>Your bookmarked listings:</Text>
                <TouchableOpacity style={styles.editButton} onPress={toggleEditMode}>
                    <Text style={styles.editText}>{editMode ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>

                <ScrollView style={styles.bookmarkedListingsContainer} contentContainerStyle={styles.bookmarkedListings}>
                    <View style={styles.listingsGrid}>
                        {bookmarkedListings.map((listing, index) => (
                            <View key={index} style={styles.listingCard}>
                                <Image source={{ uri: images[assignedImages[listing.address]] }} style={styles.listingImage} />
                                <View style={styles.textContainer}>
                                    <View style={styles.detailRow}>
                                        <Image source={locationIcon} style={styles.infoIcon} />
                                        <Text style={styles.listingAddress}>{listing.address}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Image source={priceIcon} style={styles.infoIcon} />
                                        <Text style={styles.listingDetails}>${listing.resale_price.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Image source={areaIcon} style={styles.infoIcon} />
                                        <Text style={styles.listingDetails}>{listing.floor_area_sqm} sqm</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Image source={typeIcon} style={styles.infoIcon} />
                                        <Text style={styles.listingDetails}>{listing.flat_type}</Text>
                                    </View>
                                </View>

                                {editMode && (
                                    <TouchableOpacity 
                                        style={styles.deleteButton} 
                                        onPress={() => toggleSaveListing(listing)}
                                    >
                                        <Text style={styles.deleteText}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    backdrop: {
        width: '100%',
        height: 200,
        position: 'absolute',
        top: 0,
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
    icon: {
        width: 35,
        height: 35,
    },
    infoIcon: {
        width: 20,
        height: 20,
        marginRight: 5,
    },
    backText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    content: {
        marginTop: 120,
        width: '80%', 
        height: 650,  
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    bookmarkedTitle: {
        fontSize: 24,
        alignSelf: 'center',
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 20,
    },
    bookmarkedListingsContainer: {
        flex: 1, 
        marginTop: 10,
        marginHorizontal: 10,
        paddingBottom: 20,
    },
    bookmarkedListings: {
        paddingBottom: 20,
        justifyContent: 'flex-start',
    },
    listingsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5,
        justifyContent: 'space-around',
    },
    listingCard: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
        marginBottom: 15,
        width: '30%',
    },
    listingImage: {
        width: '100%',
        height: 120,
    },
    textContainer: {
        padding: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    listingAddress: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    listingDetails: {
        fontSize: 13,
        color: '#555',
    },
    listingPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
    },
    editButton: {
        top: 18,
        right: 5,
        padding: 10,
        alignItems: 'center',
        width: '10%',
        marginBottom: 20,
        position: 'absolute',
    },
    editText: {
        color: '#64AFF4',
        fontWeight: 'bold',
        fontSize: 18,
    },
    deleteButton: {
        marginTop: 3,
        padding: 5,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        backgroundColor: '#ff4d4d',
        alignItems: 'center',
    },
    deleteText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default BookmarksScreen;