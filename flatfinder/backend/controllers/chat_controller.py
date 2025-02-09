import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from typing import Dict, Optional, List
from dotenv import load_dotenv

router = APIRouter()

load_dotenv()

GEMINI_API_KEY = os.getenv("GOOGLE_MAPS_GEOCODING_API_KEY")
GEMINI_API_URL = "https://api.google.com/gemini/v1/chat" 

class ChatRequest(BaseModel):
    user_input: str
    user_preferences: Optional[Dict[str, str]] = None 
    history: Optional[List[Dict[str, str]]] = None 

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    raise EnvironmentError("Google API key is not set in the environment.") 

model = genai.GenerativeModel('gemini-pro')
chat_session = model.start_chat(history=[])

def format_response(response_text: str) -> str:
    """
    Formats the given response text by cleaning up unnecessary characters
    and converting markdown-style bullet points to a more readable format.

    Args:
        response_text (str): The raw response text to format.

    Returns:
        str: The formatted response text with cleaned up bullet points.
    """
    formatted_text = response_text.strip().replace("**", "")  
    formatted_text = "\n".join(
        f"• {line[1:].strip()}" if line.startswith("*") else line
        for line in formatted_text.splitlines()
    )
    return formatted_text

@router.post("/chat")
async def google_gemini_chat(request: ChatRequest):
    """
    Handles chat requests by processing user input and preferences, 
    then interacting with the Google Gemini API to generate a response.

    This function expects a ChatRequest object containing user input, 
    optional user preferences, and an optional chat history. It formats
    the preferences and history into a prompt for the Google Gemini 
    API, sends the prompt, and formats the API's response before 
    returning it to the user.

    Args:
        request (ChatRequest): The request object containing user input, 
        preferences, and chat history.

    Returns:
        dict: A dictionary with the formatted response text. If user 
        preferences are missing, prompts the user to provide them.

    Raises:
        HTTPException: If an error occurs while communicating with the 
        Google Gemini API.
    """
    try:
        preferences_text = ""
        
        default_values = {
                "salary": 0,
                "cpf_balance": 0,
                "hdb_type": "",
                "preferred_price": 0,
                "housing_loan_type": ""
            }
        
        preferences_missing = all(
                request.user_preferences.get(key, None) == default
                for key, default in default_values.items()
            )
        
        if request.user_preferences:            
            if preferences_missing:
                return {"response": "Please enter your preferences (e.g., salary, CPF balance, HDB type, etc.) so I can assist you better."}
            else:
                preferences_text = "User information and preferences:\n" + "\n".join(
                    f"- {key.capitalize().replace('_', ' ')}: {value}"
                    for key, value in request.user_preferences.items()
                )
                
                history_text = "\n".join(
                    f"{msg['sender']}: {msg['text']}" for msg in (request.history or [])
                )
                prompt = f"{preferences_text}\n{history_text}\nUser input: {request.user_input}"
                
                response = chat_session.send_message(prompt, stream=True)
                response_text = "".join(chunk.text for chunk in response if chunk.text)
                formatted_response = format_response(response_text)
                
                formatted_response += "\n\nFor further assistance, feel free to contact us at flatfinder@gmail.com!"
                
                return {"response": formatted_response}        

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Google Gemini: {str(e)}")
