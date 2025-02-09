from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel
from firebase_admin import credentials, firestore

cred = credentials.Certificate('./firebase-admin-sdk.json')
db = firestore.client()

router = APIRouter()

class UpdateProfileRequest(BaseModel): 
    salary: float 
    cpf_balance: float 
    hdb_type: str 
    preferred_price: float 
    housing_loan_type: str 
 
class SaveListingRequest(BaseModel): 
    address: str 
    resale_price: float 
    floor_area_sqm: int 
    flat_type: str 
    email: str
 
def default_user_data(email): 
    """
    Returns the default data for a user given the email address.

    :param email: The user's email address
    :return: A dictionary with default user data
    """
    return { 
        "email": email.lower(), 
        "salary": 0.0, 
        "cpf_balance": 0.0,        
        "hdb_type": "", 
        "preferred_price": 0.0, 
        "housing_loan_type": "" 
    } 
 
def default_saved_listings(email): 
    """
    Returns the default saved listings data for a user given the email address.

    Args:
        email (str): The user's email address.

    Returns:
        dict: A dictionary with the user's email and an empty list of saved listings.
    """
    return { 
        "email": email.lower(), 
        "saved_listings": [] 
    } 

@router.get("/user/preferences/{email}")
async def get_user_preferences(email: str):
    """
    Retrieves the user's preferences by email.

    Args:
        email (str): The user's email address

    Returns:
        dict: A dictionary containing the user's preferences

    Raises:
        HTTPException: If there's an error retrieving data, with a status code of 500
    """
    email = email.lower()
    try:
        user_ref = db.collection('users').where('email', '==', email).limit(1).stream()
        user_data = next(user_ref, None)
        
        if user_data:
            return user_data.to_dict()
        else:
            new_user_data = default_user_data(email)
            db.collection('users').add(new_user_data)
            return new_user_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving data: {str(e)}")

@router.post("/user/preferences/{email}")
async def update_user_preferences(email: str, request: UpdateProfileRequest):
    """
    Updates a user's preferences given their email address and a request body containing the preferences to update.

    Args:
        email (str): The user's email address.
        request (UpdateProfileRequest): A pydantic model containing the user's preferences to update.

    Returns:
        dict: A dictionary with a success message if the update is successful.

    Raises:
        HTTPException: If there's an error updating data, with a status code of 500
    """
    email = email.lower()
    try:
        user_ref = db.collection('users').where('email', '==', email).limit(1).stream()
        user_doc = next(user_ref, None)

        if user_doc:
            db.collection('users').document(user_doc.id).update(request.dict())
            return {"message": "Preferences updated successfully"}
        else:
            new_user_data = default_user_data(email)
            new_user_data.update(request.dict())  
            db.collection('users').add(new_user_data)
            return {"message": "User created and preferences updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating data: {str(e)}")

@router.get("/user/saved-listings/{email}")
async def get_user_saved_listings(email: str):
    """
    Retrieves the user's saved listings by email.

    Args:
        email (str): The user's email address

    Returns:
        list: A list of dictionaries containing the user's saved listings

    Raises:
        HTTPException: If there's an error retrieving data, with a status code of 500
    """
    email = email.lower()
    try:
        saved_listings = db.collection("saved_listings").where("email", "==", email).stream()
        listings = [doc.to_dict() for doc in saved_listings]
        return listings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading saved listings: {str(e)}")

@router.post("/user/saved-listings/{email}")
async def toggle_user_saved_listing(email: str, request: SaveListingRequest):
    """
    Toggles a listing as saved for a user given their email and a request body containing the listing address.

    Args:
        email (str): The user's email address
        request (SaveListingRequest): A pydantic model containing the listing address to toggle

    Returns:
        dict: A dictionary with a success message if the toggle is successful.

    Raises:
        HTTPException: If there's an error toggling saved listing, with a status code of 500
    """
    email = email.lower()
    try:
        saved_listings = db.collection("saved_listings").where("email", "==", email).where("address", "==", request.address).stream()
        existing_listing = next((doc for doc in saved_listings), None)

        if existing_listing:            
            db.collection("saved_listings").document(existing_listing.id).delete()
            return {"message": "Listing removed from saved listings"}
        else:
            db.collection("saved_listings").add(request.dict())
            return {"message": "Listing added to saved listings"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error toggling saved listing: {str(e)}")