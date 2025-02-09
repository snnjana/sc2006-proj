import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Picker, ActivityIndicator, Animated, Image, ScrollView, Modal, Easing, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@env';
import estates from '../../backend/data/estates.json';
import propertyImages from '../../backend/data/propertyimages.json';
import locationIcon from '../../assets/location-icon.png';
import priceIcon from '../../assets/price-icon.png';
import interestIcon from '../../assets/interest.png';
import areaIcon from '../../assets/area-icon.png';
import typeIcon from '../../assets/type-icon.png'
import compareIcon from '../../assets/compare-icon.png';
import stopCompareIcon from '../../assets/stopcompare-icon.png';
import phoneIcon from '../../assets/whatsapp-icon.png';

const initialZoomLevel = 15;
BACKEND_URL = "http://127.0.0.1:8000";

/**
 * Returns a string representation of a given price,
 * with commas inserted at every 3rd digit from the right.
 * @param {number} price - The price to be formatted.
 * @returns {string} The formatted price string.
 */
const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * The HomeScreen which provides a map-based interface for users to browse
 * and compare real estate listings based on their preferences.
 * 
 * The component maintains state for user preferences, selected markers,
 * apartment details, and UI animations. It interacts with backend services
 * to fetch user data, apartment listings, and amenities, and provides
 * functionality to save or compare listings.
 * 
 * Props:
 * - navigation: React Navigation prop for navigating between screens.
 * 
 * State:
 * - markers: Array of map markers representing apartment listings.
 * - selectedEstate: Currently selected estate for filtering listings.
 * - loading: Boolean indicating if apartment data is being loaded.
 * - imageLoading: Boolean indicating if apartment images are being loaded.
 * - center: Object with latitude and longitude for map centering.
 * - selectedMarker: Marker object representing the currently selected listing.
 * - apartmentDetails: Array with details of the selected apartment.
 * - compareApartmentDetails: Array with details of the apartment being compared.
 * - compareImageLoading: Boolean indicating if comparison image is being loaded.
 * - isSaveListing: Boolean indicating if the current listing is saved.
 * - slideAnim: Animated value for the slide-in effect of the listing panel.
 * - slideAnimCompare: Animated value for the slide-in effect of the compare panel.
 * - zoomLevel: Number representing the current map zoom level.
 * - amenityTypes: Array of unique amenity types for filtering.
 * - selectedAmenityType: Currently selected amenity type for filtering.
 * - compareMarker: Marker object for the listing being compared.
 * - isCompareModalVisible: Boolean indicating if the compare modal is visible.
 * - isCompareMode: Boolean indicating if the component is in compare mode.
 * - waitingForCompareMarker: Boolean indicating if the component is waiting for a compare marker.
 * - isCompareListingSaved: Boolean indicating if the compared listing is saved.
 * - userEmail: String containing the user's email address.
 * 
 * Effects:
 * - Load user email and preferences on mount.
 * - Fetch apartments when a new estate is selected.
 * - Check if the selected or compared listing is saved.
 * - Handle image loading state transitions.
 */
export default function HomeScreen({ navigation }) {
    const [markers, setMarkers] = useState([]);
    const [selectedEstate, setSelectedEstate] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [center, setCenter] = useState({ lat: 1.3521, lng: 103.8198 });
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [apartmentDetails, setApartmentDetails] = useState(null);
    const [compareApartmentDetails, setCompareApartmentDetails] = useState(null);
    const [compareImageLoading, setCompareImageLoading] = useState(true);
    const [isSaveListing, setSaveListing] = useState(false);
    const slideAnim = useRef(new Animated.Value(-1000)).current;
    const slideAnimCompare = useRef(new Animated.Value(2000)).current;
    const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
    const [amenityTypes, setAmenityTypes] = useState([]);
    const [selectedAmenityType, setSelectedAmenityType] = useState('');
    const [compareMarker, setCompareMarker] = useState(null); 
    const [isCompareModalVisible, setCompareModalVisible] = useState(false);
    const [isCompareMode, setIsCompareMode] = useState(false); 
    const [waitingForCompareMarker, setWaitingForCompareMarker] = useState(false);
    const [isCompareListingSaved, setCompareListingSaved] = useState(false);
    const [userEmail, setUserEmail] = useState('');

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
     * Fetches the user's preferences from the backend and returns them as an object.
     * 
     * The function makes a GET request to the backend server with the user's email as a parameter.
     * If the request is successful and the user exists, the function returns an object with the user's
     * preferences. If the user does not exist, the function throws an error.
     * 
     * @param {string} email - The user's email address.
     * @returns {object} An object with the user's preferences, with the following properties:
     *  - salary: string - The user's salary as a string.
     *  - cpf_balance: string - The user's CPF balance as a string.
     *  - hdb_type: string - The user's preferred HDB type.
     *  - preferred_price: string - The user's preferred price as a string.
     *  - housing_loan_type: string - The user's preferred housing loan type.
     */
    const fetchUserData = async (email) => {
        try {
            const response = await fetch(`${BACKEND_URL}/user/preferences/${email}`);
            if (!response.ok) throw new Error("User not found");
            const userData = await response.json();
    
            return {
                salary: userData.salary.toString(),
                cpf_balance: userData.cpf_balance.toString(),
                hdb_type: userData.hdb_type,
                preferred_price: userData.preferred_price.toString(),
                housing_loan_type: userData.housing_loan_type 
            };
        } catch (error) {
            console.error("Error loading user data:", error);
            return null;
        }
    };
    
    /**
     * Returns the interest rate for a given loan type and loan tenure.
     * 
     * The function returns a string representing the interest rate for the given loan type and loan tenure.
     * If the loan type is not recognized, the function returns "Unknown Loan Type".
     * 
     * @param {string} loanType - The type of loan.
     * @param {number} loanTenure - The tenure of the loan in years.
     * @returns {string} The interest rate as a string.
     */
    const getInterestRate = (loanType, loanTenure) => {
        if (loanType === "HDB Housing Loan") {
            return "2.6% per annum";
        } else if (loanType === "DBS 5 Year Fixed Package") {
            if (loanTenure <= 5) {
                return "2.5% per annum for the first 5 years";
            } else {
                return "2.5% per annum for the first 5 years, then 4.48% per annum";
            }
        }
        return "Unknown Loan Type";
    };
    
    /**
     * Fetches a list of apartments for a given estate based on the user's preferences.
     * 
     * The function fetches the user's preferences from the backend server and then
     * makes a GET request to the backend server with the user's preferences as parameters.
     * It then sets the markers state with the response data.
     * 
     * If the request fails, it logs the error to the console and shows an alert to the user.
     * 
     * @param {string} estate - The estate to fetch apartments for.
     */
    const fetchApartments = async (estate) => {    
        setLoading(true);
        try {
            const userData = await fetchUserData(userEmail);

            if (!userData) {
                alert("Failed to load user data for apartments.");
                return;
            }
    
            const { salary, hdb_type, preferred_price, cpf_balance } = userData;
            const response = await fetch(`${BACKEND_URL}/apartments?estate=${estate}&preferred_price=${preferred_price}&salary=${salary}&flat_type=${hdb_type}&cpf_oa_balance=${cpf_balance}&hdb_type=${hdb_type}`);
            const data = await response.json();            
    
            const selectedEstateData = estates.find(e => e.name === estate);
            if (selectedEstateData) {
                setCenter(selectedEstateData.coords);
            }
    
            setMarkers(data.map(item => ({
                ...item,
                address: `${item.block} ${item.street_name}`,
                month: `${item.month}`,
                resale_price: `${item.resale_price}`,
                color: `${item.color}`, 
            })));
            
    
        } catch (error) {
            console.error('Error fetching apartments:', error);
        } finally {
            setLoading(false);
        }
    };       

    /**
     * Fetches a list of nearby amenities for a given location.
     * 
     * The request is made to the backend's /nearby-amenities endpoint.
     * 
     * If the request is successful, it returns the list of amenities and updates the state with the unique types of amenities.
     * 
     * If the request fails, it logs the error to the console and returns an empty array.
     * 
     * @param {number} latitude - The latitude of the location to search around.
     * @param {number} longitude - The longitude of the location to search around.
     * 
     * @returns {Promise<Array<{name: string, address: string, type: string, rating: number}>>}
     */
    const fetchNearbyAmenities = async (latitude, longitude) => {
        try {
            const response = await fetch(`${BACKEND_URL}/nearby-amenities?latitude=${latitude}&longitude=${longitude}`);
            const data = await response.json();

            const types = [...new Set(data.map(amenity => amenity.type))];
            setAmenityTypes(types);

            return data;
        } catch (error) {
            console.error("Error fetching nearby amenities from backend:", error);
            return [];
        }
    };    

    useEffect(() => {
        if (selectedEstate) {
            fetchApartments(selectedEstate);
        }
    }, [selectedEstate]);

    /**
     * Toggles the saved status of a selected listing for the current user.
     * 
     * Retrieves the user's email from AsyncStorage and constructs the listing details
     * including address, resale price, floor area, flat type, and email. Sends a POST
     * request to the backend to toggle the saved status of the listing. If the request
     * is successful, the local saved state is updated and a success message is logged,
     * and the bookmarking heart symbol becomes highlighted. If the request fails, an error alert is shown.
     */
    const toggleSaveNormal = async () => {
        const email = await AsyncStorage.getItem('userEmail');
        const listingDetails = {
            address: selectedMarker.address,
            resale_price: apartmentDetails[0].resale_price,
            floor_area_sqm: apartmentDetails[0].floor_area_sqm,
            flat_type: apartmentDetails[0].flat_type,
            email: email
        };
    
        const response = await fetch(`${BACKEND_URL}/user/saved-listings/${userEmail}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listingDetails)
        });
    
        const data = await response.json();
        if (response.ok) {
            setSaveListing(!isSaveListing);
            console.log(data.message);
        } else {
            alert('Failed to bookmark listing, please try again.');
        }
    };
    
    /**
     * Toggles the saved status of the compared listing for the current user.
     * 
     * Retrieves the user's email from AsyncStorage and constructs the listing details
     * including address, resale price, floor area, flat type, and email. Sends a POST
     * request to the backend to toggle the saved status of the listing. If the request
     * is successful, the local saved state is updated and a success message is logged,
     * and the bookmarking heart symbol becomes highlighted. If the request fails, an error alert is shown.
     */
    const toggleSaveCompare = async () => {
        const email = await AsyncStorage.getItem('userEmail');
        const listingDetails = {
            address: compareMarker.address,
            resale_price: compareApartmentDetails[0].resale_price,
            floor_area_sqm: compareApartmentDetails[0].floor_area_sqm,
            flat_type: compareApartmentDetails[0].flat_type,
            email: email
        };
    
        const response = await fetch(`${BACKEND_URL}/user/saved-listings/${userEmail}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listingDetails)
        });
    
        const data = await response.json();
        if (response.ok) {
            setCompareListingSaved(!isCompareListingSaved);
            console.log(data.message);
        } else {
            alert('Failed to bookmark listing, please try again.');
        }
    };    

    /**
     * Checks if a listing is saved for the current user.
     * 
     * The function takes the address of the listing to check as a parameter.
     * It makes a GET request to the backend's /user/saved-listings endpoint
     * to retrieve the user's saved listings. If the request is successful, it
     * checks if the listing with the given address is in the list of saved listings.
     * 
     * @param {string} markerAddress - The address of the listing to check.
     * 
     * @returns {Promise<boolean>} A promise that resolves with a boolean indicating
     * whether the listing is saved or not.
     */
    const checkIfSaved = async (markerAddress) => {
        const savedListings = await fetch(`${BACKEND_URL}/user/saved-listings/${userEmail}`);
        const listings = await savedListings.json();

        const isListingSaved = listings.some(listing => listing.address === markerAddress);
        return isListingSaved;
    };

    useEffect(() => {
        if (selectedMarker) {
            checkIfSaved(selectedMarker.address).then(savedStatus => {
                setSaveListing(savedStatus);
            });
        }
    }, [selectedMarker]);
    
    useEffect(() => {
        if (compareMarker) {
            checkIfSaved(compareMarker.address).then(savedStatus => {
                setCompareListingSaved(savedStatus);
            });
        }
    }, [compareMarker]);

    useEffect(() => {
        if (!imageLoading && apartmentDetails.length > 0) {
            setLoading(false); 
        }
    }, [imageLoading, apartmentDetails]);

    /**
     * Triggers an animated slide-in effect for the regular listing panel.
     * 
     * The animation moves the component to the final position with a smooth
     * easing effect over a duration of 600 milliseconds. It uses the native
     * driver for improved performance.
     */
    const slideIn = () => {
        Animated.timing(slideAnim, {
            toValue: 0, 
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    };

    /**
     * Triggers an animated slide-out effect for the regular listing panel.
     * 
     * The animation moves the component back to the start position with a smooth
     * easing effect over a duration of 600 milliseconds. It uses the native
     * driver for improved performance.
     * 
     * When the animation is complete, it resets the selected marker and zoom level
     * to their initial states.
     */
    const slideOut = () => {
        Animated.timing(slideAnim, {
            toValue: -2000, 
            duration: 600, 
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setSelectedMarker(null); 
            setZoomLevel(initialZoomLevel);
        });
    };

    /**
     * Triggers an animated slide-in effect for the compare listing panel.
     * 
     * The animation moves the component to its final position with a smooth
     * easing effect over a duration of 600 milliseconds, using the native
     * driver for improved performance.
     */
    const slideInCompare = () => {
        Animated.timing(slideAnimCompare, {
            toValue: 0,
            duration: 600, 
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    };

    /**
     * Triggers an animated slide-out effect for the compare listing panel.
     * 
     * The animation moves the component back to the start position with a smooth
     * easing effect over a duration of 600 milliseconds. It uses the native
     * driver for improved performance.
     * 
     * When the animation is complete, it resets the compare marker and zoom level
     * to their initial states.
     */
    const slideOutCompare = () => {
        Animated.timing(slideAnimCompare, {
            toValue: 2000,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setCompareMarker(null);
            setZoomLevel(initialZoomLevel);
        });
    };

    /**
     * Exits compare mode and resets the UI to its initial state.
     * 
     * This function is called when the user clicks the stop compare button.
     * 
     * It sets the compare mode flag to false, slides out the compare
     * listing panel, resets the compare marker, and resets the zoom
     * level to its initial value.
     */
    const exitCompareMode = () => {
        setIsCompareMode(false);
        slideOutCompare();
        setCompareMarker(null);
        setZoomLevel(initialZoomLevel);
    };

    /**
     * Generates a random agent phone number in the 
     * format of 8 or 9 followed by 7 digits.
     * 
     * @returns {string} A random phone number as a string.
     */
    const generateRandomPhoneNumber = () => {
        const firstDigit = Math.random() < 0.5 ? '9' : '8';
        const remainingDigits = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
        return `${firstDigit}${remainingDigits}`;
    };

    /**
     * Handles the event when a marker on the map is clicked.
     * 
     * Fetches user data to determine loan interest rate and handles
     * marker click differently based on the comparison mode status.
     * 
     * If in compare mode, it invokes the compare marker click handler.
     * Otherwise, it fetches apartment details, updates the map center 
     * and zoom level, and manages UI updates related to the clicked marker.
     * 
     * @param {Object} marker - The marker object containing location details.
     */
    const handleMarkerClick = async(marker) => {
    const userData = await fetchUserData(userEmail);
    const { housing_loan_type } = userData;
    const interestRate = getInterestRate(housing_loan_type, userData.loan_tenure);
        if (isCompareMode) {
            handleCompareMarkerClick(marker);
        } else {
            setZoomLevel(initialZoomLevel);
            setTimeout(async () => {
                setSelectedMarker(marker);
                const savedStatus = await checkIfSaved(marker.address);
                const phoneNumber = generateRandomPhoneNumber();
                setSaveListing(savedStatus);
                setApartmentDetails(null); 
                const offset = -0.0013;
                setCenter({ 
                    lat: parseFloat(marker.latitude), 
                    lng: parseFloat(marker.longitude) + offset 
                });
                setZoomLevel(18);
                slideIn();
                setImageLoading(true);
    
                try {
                    const data = await fetchApartmentDetails(marker);
                    const imageUrl = await fetchRoomImage(marker);
                    if (imageUrl) {
                        await AsyncStorage.setItem(`image_${marker.block}_${marker.street_name}`, imageUrl);
                    }
                    setApartmentDetails([{ ...data[0], imageUrl, interestRate, phoneNumber }]);
                } catch (error) {
                    console.error('Error fetching apartment details or image:', error);
                } finally {
                    setImageLoading(false);
                }
            }, 500);  
        }
    };

    /**
     * Fetches apartment details from the backend API.
     * 
     * Given a marker object containing location details, it fetches the apartment
     * details from the backend API and returns a Promise resolving to an array of
     * objects containing the apartment details with an "amenities" property.
     * 
     * The "amenities" property contains an array of amenities data fetched from
     * the Nearby Amenities API.
     * 
     * @param {Object} marker - The marker object containing location details.
     * @returns {Promise<Array<Object>>} A Promise resolving to an array of objects
     *                                   containing the apartment details with an
     *                                   "amenities" property.
     */
    const fetchApartmentDetails = async (marker) => {
        const response = await fetch(`${BACKEND_URL}/apartment-details?block=${marker.block}&street_name=${marker.street_name}&month=${marker.month}`);
        const data = await response.json();
        const amenitiesData = await fetchNearbyAmenities(marker.latitude, marker.longitude);
        return data.map(apartment => ({
            ...apartment,
            amenities: amenitiesData,
        }));
    };

    /**
     * Fetches a unique image for a given marker address.
     * 
     * It does this by maintaining a global store of assigned images
     * and randomly selecting an unassigned image if one is not already
     * assigned for the given address. This is done via AsyncStorage.
     * 
     * If all images have been assigned, it will return null.
     * 
     * @param {Object} marker - The marker object containing location details.
     * @returns {string | null} The URL of the assigned image or null if no more
     *                          unique images are available.
     */
    const fetchRoomImage = async(marker) => {
        let assignedImages = await AsyncStorage.getItem('globalAssignedImages');
        assignedImages = assignedImages ? JSON.parse(assignedImages) : {};

        const addressKey = `${marker.block} ${marker.street_name}`;

        if (assignedImages[addressKey]) {
            return propertyImages[assignedImages[addressKey]];
        } else {
            const availableIndices = propertyImages.map((_, index) => index)
                .filter(index => !Object.values(assignedImages).includes(index));

            if (availableIndices.length === 0) {
                console.error('No more unique images available');
                return null;
            }

            const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            assignedImages[addressKey] = randomIndex;
            await AsyncStorage.setItem('globalAssignedImages', JSON.stringify(assignedImages));

            return propertyImages[randomIndex];
        }
    };

    /**
     * Handles the click event on a compare marker and fetches the corresponding apartment details.
     * 
     * The function initiates the compare mode and resets the zoom level. It retrieves the user's
     * data including housing loan type and calculates the interest rate. If a marker is clicked,
     * it fetches its apartment details and assigns a unique image to the listing, along with a random
     * phone number. It also checks if the listing is saved and updates the UI accordingly.
     * 
     * The function sets a timeout to handle asynchronous operations smoothly. If no marker is provided,
     * it displays a modal indicating for the user to click a marker and waits for user input. 
     * In case of errors during data fetching, it logs the
     * error and ensures the loading state is properly managed.
     * 
     * @param {Object} marker - The marker object containing location details. 
     */
    const handleCompareMarkerClick = async(marker) => {
        const userData = await fetchUserData(userEmail);
        setIsCompareMode(true);
        setZoomLevel(initialZoomLevel);
        const { housing_loan_type } = userData;
        const interestRate = getInterestRate(housing_loan_type, userData.loan_tenure);
        setTimeout(async () => {
            if (!marker) {
                setCompareModalVisible(true);
                setWaitingForCompareMarker(true);
                return;
            } else {
                setWaitingForCompareMarker(false);
                setCompareMarker(marker);
                const savedStatus = await checkIfSaved(marker.address);
                const phoneNumber = generateRandomPhoneNumber();
                setCompareListingSaved(savedStatus);
                setCompareApartmentDetails(null); 
                setCenter({ 
                    lat: parseFloat(marker.latitude), 
                    lng: parseFloat(marker.longitude) 
                });
                setZoomLevel(18); 
                slideInCompare();
                setCompareImageLoading(true);
    
                try {
                    const data = await fetchApartmentDetails(marker);
                    const imageUrl = await fetchRoomImage(marker);
                    if (imageUrl) {
                        await AsyncStorage.setItem(`image_${marker.block}_${marker.street_name}_compare`, imageUrl);
                    }
                    setCompareApartmentDetails([{ ...data[0], imageUrl, interestRate, phoneNumber }]);
                } catch (error) {
                    console.error('Error fetching apartment details or image:', error);
                } finally {
                    setCompareImageLoading(false);
                }
            }
        }, 500);  
    };

    /**
     * Logs out the current user by invalidating the authentication token.
     * 
     * Retrieves the authentication token from AsyncStorage and sends a POST request
     * to the backend logout endpoint to invalidate the session. If the request is
     * successful, the token is removed from storage, a success message is displayed,
     * and the user is navigated to the LoginScreen. If the request fails, an error
     * message is displayed. If no token is found, a message indicating no active session
     * is shown.
     * 
     * Catches any errors during the process and displays an error message to the user.
     */
    const handleLogout = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (token) {
                const response = await fetch('${BACKEND_URL}/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                if (response.ok) {
                    await AsyncStorage.removeItem('authToken');
                    alert('Logged out successfully!');
                    navigation.navigate('Login');
                } else {
                    const data = await response.json();
                    alert(`Error logging out: ${data.detail}`);
                }
            } else {
                alert('No active session found.');
            }
        } catch (error) {
            alert('Error logging out: ', error);
        }
    };

    /**
     * Converts a given string to title case.
     * 
     * This function takes a string, splits it into words, capitalizes the first
     * letter of each word, and then joins the words back together with spaces.
     * 
     * @param {string} str - The string to convert to title case.
     * 
     * @returns {string} The string converted to title case.
     */
    const toTitleCase = (str) => {
        return str
            .toLowerCase() 
            .split(' ') 
            .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
            .join(' '); 
    }; 

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to FlatFinder!</Text>
            <Text style={styles.subheading}>We've filtered available listings by your preferences - click one to get started.</Text>

            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: 'green' }]} />
                    <Text>Best matches</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: 'orange' }]} />
                    <Text>Less applicable matches</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: 'red' }]} />
                    <Text>Least applicable matches</Text>
                </View>
            </View>

            <View style={styles.dropdownContainer}>
                <Picker
                    selectedValue={selectedEstate}
                    onValueChange={(itemValue) => {
                        setSelectedEstate(itemValue);
                        setZoomLevel(initialZoomLevel); 
                    }}
                    style={{ borderColor: "#fff" }}
                >
                    <Picker.Item label="Select an estate" value="" style={styles.pickerItem}/>
                    {estates.map((estate, index) => (
                        <Picker.Item key={index} label={estate.name} value={estate.name} style={styles.pickerItem}/>
                    ))}
                </Picker>
            </View>
            
            <TouchableOpacity style={styles.preferencesButton} onPress={() => navigation.navigate('Edit')}>
                <Text style={styles.editText}>View housing and financing preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bookmarksButton} onPress={() => navigation.navigate('Bookmarks')}>
                <Text style={styles.editText}>View bookmarks</Text>
            </TouchableOpacity>

            <Map 
                markers={markers} 
                loading={loading} 
                center={center} 
                zoomLevel={zoomLevel}
                onMarkerClick={handleMarkerClick}
            />

            <Animated.View style={[styles.sidePanel, { transform: [{ translateX: slideAnim }] }]}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>                    
                    {!apartmentDetails && (
                        <View style={styles.loadingPanel}>
                            <ActivityIndicator size="large" color="#64AFF4" />
                        </View>
                    )}
                    {selectedMarker && apartmentDetails && (
                        <>
                            <View style={styles.titleRow}>
                                <Text style={styles.sidePanelTitle}>{toTitleCase(selectedMarker.address)}</Text>

                                {isCompareMode ? (
                                    <TouchableOpacity onPress={exitCompareMode} style={styles.compareButton}>
                                        <Image source={stopCompareIcon} style={{ width: 40, height: 40, right: 40 }} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity onPress={() => handleCompareMarkerClick(compareMarker)} style={styles.compareButton}>
                                        <Image source={compareIcon} style={{ width: 40, height: 40, right: 40 }} />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={toggleSaveNormal}>
                                    <Image
                                        source={isSaveListing
                                            ? require('../../assets/bookmark-highlighted.png')
                                            : require('../../assets/bookmark-unhighlighted.png')
                                        }
                                        style={{ width: 40, height: 40, right: 10 }}
                                    />
                                </TouchableOpacity>
                            </View>
                            
                            {apartmentDetails[0]?.imageUrl ? (
                                <Image
                                    source={{ uri: apartmentDetails[0].imageUrl }}
                                    style={styles.hdbImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text style={styles.sidePanelContent}>No image available</Text>
                            )}
                            
                            <View style={styles.detailRow}>
                                <Image source={locationIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{toTitleCase(selectedMarker.address)}, S{apartmentDetails[0]?.postal_code}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={priceIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>${formatPrice(apartmentDetails[0].resale_price)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                            <Image source={interestIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>Interest Rate: {apartmentDetails[0].interestRate}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={areaIcon}style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{apartmentDetails[0].floor_area_sqm} sqm</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={typeIcon}style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{toTitleCase(apartmentDetails[0].flat_type)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={phoneIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{apartmentDetails[0].phoneNumber}</Text>
                            </View>

                            <Text style={styles.amenityTitle}>Nearby Amenities:</Text>
                            <View style={styles.amenityDropdownContainer}>
                                <Picker
                                    selectedValue={selectedAmenityType}
                                    onValueChange={(itemValue) => setSelectedAmenityType(itemValue)}
                                    style={{ borderColor: "#fff" }}
                                >
                                    <Picker.Item label="All Amenities" value="" style={styles.pickerItem}/>
                                    {amenityTypes.map((type, index) => (
                                        <Picker.Item key={index} label={type} value={type} style={styles.pickerItem}/>
                                    ))}
                                </Picker>
                            </View>

                            {apartmentDetails[0]?.amenities && apartmentDetails[0].amenities.length > 0 ? (
                                apartmentDetails[0].amenities
                                    .filter(amenity => !selectedAmenityType || amenity.type === selectedAmenityType)
                                    .filter(amenity => amenity.address)
                                    .map((amenity, index) => (
                                        <View key={index} style={styles.amenityContainer}>
                                            <Text style={styles.amenityName}>{amenity.name}</Text>
                                            <Text style={styles.amenityDetails}>Type: {amenity.type}</Text>
                                            <Text style={styles.amenityDetails}>Address: {amenity.address}</Text>
                                            {amenity.rating && (
                                                <Text style={styles.amenityDetails}>Rating: {amenity.rating}</Text>
                                            )}
                                        </View>
                                    ))
                            ) : (
                                <Text style={styles.sidePanelContent}>No amenities found nearby.</Text>
                            )}
                            <TouchableOpacity onPress={slideOut}>
                                <Text style={styles.closeButton}>Close</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </Animated.View>

            <Animated.View style={[styles.comparisonPanel, { transform: [{ translateX: slideAnimCompare }] }]}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>                    
                    {!compareApartmentDetails && (
                        <View style={styles.loadingPanel}>
                            <ActivityIndicator size="large" color="#64AFF4" />
                        </View>
                    )}
                    {compareMarker && compareApartmentDetails && (
                        <>
                            <View style={styles.titleRow}>
                                <Text style={styles.sidePanelTitle}>{toTitleCase(compareMarker.address)}</Text>

                                <TouchableOpacity onPress={toggleSaveCompare}>
                                    <Image
                                        source={isCompareListingSaved
                                            ? require('../../assets/bookmark-highlighted.png')
                                            : require('../../assets/bookmark-unhighlighted.png')
                                        }
                                        style={{ width: 40, height: 40, right: 10 }}
                                    />
                                </TouchableOpacity>
                            </View>
                            
                            {compareApartmentDetails[0]?.imageUrl ? (
                                <Image
                                    source={{ uri: compareApartmentDetails[0].imageUrl }}
                                    style={styles.hdbImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text style={styles.sidePanelContent}>No image available</Text>
                            )}
                            
                            <View style={styles.detailRow}>
                                <Image source={locationIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{toTitleCase(compareMarker.address)}, S{compareApartmentDetails[0]?.postal_code}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={priceIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>${formatPrice(compareApartmentDetails[0].resale_price)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                            <Image source={interestIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>Interest Rate: {compareApartmentDetails[0].interestRate}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={areaIcon}style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{compareApartmentDetails[0].floor_area_sqm} sqm</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={typeIcon}style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{toTitleCase(compareApartmentDetails[0].flat_type)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Image source={phoneIcon} style={[styles.icon, { width: 24, height: 24 }]} />
                                <Text style={styles.infoContent}>{compareApartmentDetails[0].phoneNumber}</Text>
                            </View>

                            <Text style={styles.amenityTitle}>Nearby Amenities:</Text>
                            <View style={styles.amenityDropdownContainer}>
                                <Picker
                                    selectedValue={selectedAmenityType}
                                    onValueChange={(itemValue) => setSelectedAmenityType(itemValue)}
                                    style={{ borderColor: "#fff" }}
                                >
                                    <Picker.Item label="All Amenities" value="" style={styles.pickerItem}/>
                                    {amenityTypes.map((type, index) => (
                                        <Picker.Item key={index} label={type} value={type} style={styles.pickerItem}/>
                                    ))}
                                </Picker>
                            </View>

                            {compareApartmentDetails[0]?.amenities && compareApartmentDetails[0].amenities.length > 0 ? (
                                compareApartmentDetails[0].amenities
                                    .filter(amenity => !selectedAmenityType || amenity.type === selectedAmenityType)
                                    .filter(amenity => amenity.address)
                                    .map((amenity, index) => (
                                        <View key={index} style={styles.amenityContainer}>
                                            <Text style={styles.amenityName}>{amenity.name}</Text>
                                            <Text style={styles.amenityDetails}>Type: {amenity.type}</Text>
                                            <Text style={styles.amenityDetails}>Address: {amenity.address}</Text>
                                            {amenity.rating && (
                                                <Text style={styles.amenityDetails}>Rating: {amenity.rating}</Text>
                                            )}
                                        </View>
                                    ))
                            ) : (
                                <Text style={styles.sidePanelContent}>No amenities found nearby.</Text>
                            )}
                            <TouchableOpacity onPress={slideOutCompare}>
                                <Text style={styles.closeButton}>Close</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </Animated.View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isCompareModalVisible}
                onRequestClose={() => setCompareModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Click another marker on the map for comparison.</Text>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setCompareModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

/**
 * A component that renders a Google Map with given markers and handles
 * events for marker clicks.
 *
 * @prop {Array} markers - An array of objects containing latitude, longitude, and address of the markers.
 * @prop {boolean} loading - A boolean flag indicating if the map is currently loading.
 * @prop {Object} center - An object containing the latitude and longitude of the map center.
 * @prop {function} onMarkerClick - A function that is called when a marker is clicked.
 * @prop {number} zoomLevel - An integer indicating the zoom level of the map.
 *
 * @returns {React.Component} A React component that renders a Google Map.
 */
function Map({ markers, loading, center, onMarkerClick, zoomLevel }) {

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    });

    const containerStyle = {
        width: '101.5%',
        alignItems: 'center',
        height: '580px',
        marginTop: '13px',
        position: 'relative',
    };

    const colorMarker = (color) => {
        if (color === "green") {
            return '../../assets/marker-green.png';
        } else if (color === "yellow") {
            return '../../assets/marker-yellow.png';
        } else if (color === "red") {
            return '../../assets/marker-red.png';
        } else {
            return 'default';
        }
    }

        return (
            <View style={containerStyle}>
                {isLoaded && (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={zoomLevel}
                        options={{ mapTypeControl: false, fullscreenControl: false }}
                    >
                        
                        {markers.map((marker, index) => (
                        marker.latitude && marker.longitude ? (
                            <Marker
                        key={index}
                        position={{ lat: parseFloat(marker.latitude), lng: parseFloat(marker.longitude) }}
                        title={marker.address}
                        onClick={() => onMarkerClick(marker)}
                        gmpClickable={true}
                        options ={{ 
                            icon: {
                                url: colorMarker(marker.color) 
                            }
                        }}
                    />
                        ) : null
                    ))}
    
                    </GoogleMap>
                )}
    
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#64AFF4" />
                    </View>
                )}
            </View>
        );
}

const styles = StyleSheet.create({
    amenityContainer: {
        marginVertical: 10,
        marginLeft: 15,
        marginRight: 15,
    },
    amenityTitle: {
        fontSize: 17,
        marginTop: 15,
        marginLeft: 15,
        top: 5,
        marginBottom: 15,
    },
    amenityName: {
        fontSize: 17,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    amenityDetails: {
        fontSize: 15,
        marginVertical: 2,
    },
    amenityDropdownContainer: {
        position: 'absolute',
        top: 523,   
        width: '37%',
        borderRadius: 13, 
        shadowColor: '#000', 
        shadowOpacity: 0.2,
        shadowRadius: 10,
        right: 10,
        zIndex: 10,
        backgroundColor: '#ffffff',
        shadowOffset: { width: 0, height: 2 },
        paddingHorizontal: 10,
        paddingTop: 3,
        height: 30,               
        elevation: 5,             
    },
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 90,
        paddingBottom: 10,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    bookmarkIcon: {
        width: 40,
        height: 40,
        right: 15,
    },
    comparisonPanel: {
        position: 'absolute',
        width: '35%', 
        height: '67%',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#D3D3D3',
        zIndex: 1,
        paddingTop: 15,
        top: 275,
        right: 0,
    },
    compareButton: {
        right: 10,
        position: 'absolute',
    },
    dropdownContainer: {
        position: 'absolute',
        width: '26%',
        height: 30, 
        zIndex: 10,
        marginTop: 130,
        backgroundColor: '#ffffff',
        borderRadius: 13, 
        paddingHorizontal: 10,
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5, 
        paddingTop: 3,        
    },
    pickerItem: {
        fontSize: 17,
    },
    editText: {
        color: '#64AFF4',
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
        marginVertical: 3,
    },
    hdbImage: {
        width: '100%', 
        height: 230,   
        marginVertical: 10, 
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: '#64AFF4',
        padding: 10,
        borderRadius: 5,
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },    
    infoContent: {
        marginLeft: 9,
        fontSize: 17,
        margin: 0, 
        padding: 0,
    },
    title: {
        fontSize: 35,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: -20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center', 
        justifyContent: 'space-between', 
    },
    subheading: {
        fontSize: 20,
        color: '#555',
        alignItems: 'center',
        marginBottom: 20,
    },
    sidePanel: {
        position: 'absolute',
        left: 10,
        marginLeft: -10,
        top: 275,
        width: '35%',
        height: '67%',
        backgroundColor: '#fff',
        paddingTop: 15,
        paddingLeft: 0,
        borderTopColor: '#D3D3D3',
        borderTopWidth: 1,
    },
    sidePanelTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
        marginLeft: 15,
        top: 3,
    },
    sidePanelContent: {
        fontSize: 17,
        marginTop: 15,
        marginLeft: 15,
        top: 5,
        marginVertical: 5,
        marginRight: 15,
    },
    closeButton: {
        color: '#64AFF4',
        marginTop: 15,
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 15,
        marginBottom: 35,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
        marginBottom: 50,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
        zIndex: 20,
        position: 'absolute',
    },
    loadingPanel: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
        justifyContent: 'center',
        alignItems: 'center',
        top: 275,
        zIndex: 20,
        position: 'absolute',
    },
    preferencesButton: {
        position: 'absolute',
        top: 20,
        right: 180,
        padding: 10,
    },
    bookmarksButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 10,
    },
    saveButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 10,
    },
    icon: {
        marginVertical: 3,
        marginLeft: 3,
    },
    logoutButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        padding: 10,
        borderRadius: 5,
    },
    logoutText: {
        color: '#64AFF4',
        fontSize: 17,
        fontWeight: 'bold',
    },
    loadingIndicator: {
        marginTop: 200, 
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)', 
        zIndex: 1000, 
    },
    scrollContainer: {
        paddingBottom: 40, 
    },
});