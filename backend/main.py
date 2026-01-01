import os
import io
import pandas as pd
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
from dotenv import load_dotenv

# LangChain & Gemini
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent

# Supabase
from supabase import create_client, Client

load_dotenv()

app = FastAPI()

# CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

class ExchangeRequest(BaseModel):
    code: str

class ChatRequest(BaseModel):
    message: str
    strava_token: str

@app.post("/auth/exchange")
async def exchange_token(req: ExchangeRequest):
    if not STRAVA_CLIENT_ID or not STRAVA_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Server misconfigured (missing Strava creds)")

    print(f"DEBUG: Exchange Code: {req.code}")
    print(f"DEBUG: Client ID: {STRAVA_CLIENT_ID}")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": STRAVA_CLIENT_ID,
                "client_secret": STRAVA_CLIENT_SECRET,
                "code": req.code,
                "grant_type": "authorization_code",
            },
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to exchange token: {response.text}")

    return response.json()

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Server misconfigured (missing Google API Key)")

    # 1. Fetch User Activities from Strava
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Get profile first for ID
        profile_res = await client.get(
            "https://www.strava.com/api/v3/athlete",
            headers={"Authorization": f"Bearer {req.strava_token}"},
        )
        if profile_res.status_code != 200:
             raise HTTPException(status_code=profile_res.status_code, detail="Failed to fetch profile")
        
        user_id = profile_res.json().get("id")

        # Get activities
        activities_res = await client.get(
            "https://www.strava.com/api/v3/athlete/activities?per_page=200",
            headers={"Authorization": f"Bearer {req.strava_token}"},
        )
        if activities_res.status_code != 200:
             raise HTTPException(status_code=activities_res.status_code, detail="Failed to fetch activities")

    activities_data = activities_res.json()
    if not activities_data:
        return {"answer": "I couldn't find any recent activities to analyze."}

    # 2. Load into Pandas & Clean
    df = pd.DataFrame(activities_data)
    
    # Basic cleaning
    if 'distance' in df.columns:
        df['miles'] = df['distance'] * 0.000621371  # meters to miles
    if 'moving_time' in df.columns:
        df['minutes'] = df['moving_time'] / 60.0    # seconds to minutes
    if 'start_date' in df.columns:
        df['start_date'] = pd.to_datetime(df['start_date'])

    # 3. Initialize Agent
    llm = ChatGoogleGenerativeAI(
        temperature=0, 
        model="gemini-2.5-flash",
        google_api_key=GOOGLE_API_KEY
    )

    prefix_prompt = """
    You are an AI assistant analyzing Strava running data.
    The dataframe `df` contains the user's last 100 activities.
    
    Important columns:
    - `name`: Title of the run
    - `miles`: Distance in miles
    - `minutes`: Moving time in minutes
    - `start_date`: Date of the run (datetime object)
    - `total_elevation_gain`: Elevation gain in meters (you can convert to feet by multiplying by 3.28084 if asked)
    - `average_speed`: meters/second

    FORMAT:
    Use the following format:

    Question: the input question you must answer
    Thought: you should always think about what to do
    Action: the action to take, should be one of [python_repl_ast]
    Action Input: the input to the action
    Observation: the result of the action
    ... (this Thought/Action/Action Input/Observation can repeat N times)
    Thought: I now know the final answer
    Final Answer: the final answer to the original input question

    Instructions:
    - Use the dataframe `df` to answer the question.
    - If you calculate a value, output it.
    - Round all numbers to 2 decimal places.
    - IMPORTANT: When you have the answer, you MUST start your response with "Final Answer:" followed by the answer.
    """

    agent = create_pandas_dataframe_agent(
        llm, 
        df, 
        verbose=True, 
        allow_dangerous_code=True,
        max_iterations=5,
        agent_executor_kwargs={"handle_parsing_errors": True},
        prefix=prefix_prompt
    )

    # 4. Run Query
    try:
        response_text = agent.run(req.message)
    except Exception as e:
        # Fallback if agent fails
        print(f"DEBUG: Agent Error: {e}")
        import traceback
        traceback.print_exc()
        response_text = f"I encountered an error analyzing the data: {str(e)}"

    # 5. Persist to Supabase
    if supabase and user_id:
        try:
            supabase.table("chat_logs").insert({
                "user_strava_id": user_id,
                "question": req.message,
                "answer": response_text
            }).execute()
        except Exception as e:
            print(f"Supabase logging failed: {e}")

    return {"answer": response_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
