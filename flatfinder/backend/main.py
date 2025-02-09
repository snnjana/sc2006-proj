from fastapi import FastAPI 
import firebase_admin 
from firebase_admin import credentials 
from fastapi.middleware.cors import CORSMiddleware 
from .controllers.listing_controller import router as apartments_router 
from .controllers.firebase_controller import router as auth_router
from .controllers.firestore_controller import router as user_router
from .controllers.chat_controller import router as chat_router

app = FastAPI() 

cred = credentials.Certificate('./firebase-admin-sdk.json')  

if not firebase_admin._apps: 
    firebase_admin.initialize_app(cred) 
    
app.add_middleware( 
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"], 
)  

app.include_router(apartments_router) 
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(chat_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)