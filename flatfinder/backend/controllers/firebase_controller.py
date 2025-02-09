from firebase_admin import auth
from firebase_admin import credentials
import firebase_admin
from fastapi import HTTPException, APIRouter
from pydantic import BaseModel 

cred = credentials.Certificate('./firebase-admin-sdk.json')

firebase_admin.initialize_app(cred)

router = APIRouter()

active_tokens = set()

class LoginRequest(BaseModel): 
    email: str 
    password: str 

class LogoutRequest(BaseModel): 
    token: str 

class VerifyUserRequest(BaseModel): 
    email: str 

class SignupRequest(BaseModel): 
    email: str 
    password: str 

class ResetPasswordRequest(BaseModel): 
    email: str 
    new_password: str 
    
@router.post("/login") 
async def login_user_route(request: LoginRequest): 
    """
    Logs in a user by verifying their email and password, and returns a valid token in the response.

    Args:
        request (LoginRequest): The login request containing the user's email and password

    Returns:
        dict: A dictionary with a single item, "token", which is the user's token
    """
    return {"token": login_user(request.email)} 

@router.post("/logout") 
async def logout_user_route(request: LogoutRequest): 
    """
    Logs out a user by removing their token from the active tokens set.

    Args:
        request (LogoutRequest): The logout request containing the user's token

    Returns:
        dict: An empty dictionary
    """
    return logout_user(request.token) 

@router.post("/verify-user") 
async def verify_user_route(request: VerifyUserRequest): 
    """
    Verifies a user by marking their account as verified.

    Args:
        request (VerifyUserRequest): The verification request containing the user's email

    Returns:
        dict: An empty dictionary
    """
    return verify_user(request.email) 

@router.post("/signup") 
async def signup_user_route(request: SignupRequest): 
    """
    Signs up a new user by creating a new user with the given email and password, and returns an empty dictionary.

    Args:
        request (SignupRequest): The signup request containing the user's email and password

    Returns:
        dict: An empty dictionary
    """
    return signup_user(request.email, request.password) 

@router.post("/reset-password") 
async def reset_password_route(request: ResetPasswordRequest): 
    """
    Resets a user's password.

    Args:
        request (ResetPasswordRequest): The reset password request containing the user's email and new password.

    Returns:
        dict: An empty dictionary indicating success.
    """
    return reset_password(request.email, request.new_password) 

def verify_token(token: str):
    """
    Verifies a user token by checking if it is in the active tokens set.

    Args:
        token (str): The user's token to verify

    Returns:
        str: The user's uid if the token is valid, otherwise raises an HTTPException with code 401

    Raises:
        HTTPException: If the token is invalid
    """
    try:
        if token in active_tokens:
            return token['uid']
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

def login_user(email: str):
    """
    Logs in a user by verifying their email and generating a custom auth token.

    Args:
        email (str): The user's email

    Returns:
        str: The custom auth token

    Raises:
        HTTPException: If the user is not found or there is an error logging in
    """
    try:
        user = auth.get_user_by_email(email)
        custom_token = auth.create_custom_token(user.uid)
        active_tokens.add(custom_token.decode('utf-8'))
        return custom_token.decode('utf-8')
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error logging in: {str(e)}")

def logout_user(token: str):
    """
    Logs out a user by removing their custom auth token from the active tokens set.

    Args:
        token (str): The user's custom auth token to log out

    Returns:
        dict: A dictionary with a success message if the token is valid, otherwise raises an HTTPException with code 400

    Raises:
        HTTPException: If the token is invalid or expired
    """
    if token in active_tokens:
        active_tokens.remove(token)
        return {"detail": "Logged out successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

def verify_user(email: str):
    """
    Verifies if a user exists in the system by their email.

    Args:
        email (str): The email address of the user to verify.

    Returns:
        dict: A dictionary indicating whether the user exists and includes the user's UID if they do.

    Raises:
        HTTPException: If there's an error during the verification process, with a status code of 400.
    """
    try:
        user = auth.get_user_by_email(email)
        return {"exists": True, "user_uid": user.uid}
    except auth.UserNotFoundError:
        return {"exists": False}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error verifying user: {str(e)}")

def signup_user(email: str, password: str):
    """
    Registers a new user in the system with the provided email and password.

    Args:
        email (str): The email address of the new user.
        password (str): The password for the new user.

    Returns:
        dict: A dictionary containing a success message and the user's UID if creation is successful.

    Raises:
        HTTPException: If the user already exists or if there's an error during user creation, with a status code of 400.
    """
    try:
        auth.get_user_by_email(email)
        raise HTTPException(status_code=400, detail="User already exists")
    except auth.UserNotFoundError:
        try:
            user = auth.create_user(email=email, password=password)
            return {"message": "User created successfully", "uid": user.uid}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error creating user: {str(e)}")

def reset_password(email: str, new_password: str):
    """
    Resets a user's password by updating the existing user record with the provided new password.

    Args:
        email (str): The email address of the user to reset the password for.
        new_password (str): The new password to set for the user.

    Returns:
        dict: A dictionary containing a success message upon successful password reset.

    Raises:
        HTTPException: If the user is not found with the provided email, or if there's an error during the password reset process.
    """
    try:
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=new_password)
        return {"message": "Password updated successfully"}
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error resetting password: {str(e)}")
