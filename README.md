# Stravify - Ask your running activities

Stravify is an AI-powered analytics dashboard that allows runners to chat with their Strava data using natural language. Built with a modern React frontend and a robust FastAPI backend, it leverages Google's Gemini models via LangChain to analyze your running history dynamically.

![Stravify Demo](frontend/demo.png)

## 🚀 Features

-   **Natural Language Querying**: Ask questions like "How many miles did I run last week?" or "What was my average pace in December?".
-   **Real-time Analysis**: Fetches your latest Strava activities on the fly.
-   **Secure Authentication**: Uses Strava OAuth2 for secure user login.
-   **Modern UI**: A dark-themed, responsive interface built with Tailwind CSS.

## 🛠️ Technical Stack

### Frontend
-   **React + Vite**: Fast, component-based UI development.
-   **Tailwind CSS**: Utility-first styling for a sleek, dark-mode design.
-   **Lucide React**: Beautiful, consistent iconography.
-   **Axios**: For handling API requests to the backend.

### Backend
-   **FastAPI**: High-performance Python web framework for handling API requests and async operations.
-   **LangChain**: Orchestrates the AI interactions and tool usage.
-   **Google Gemini (gemini-2.5-flash)**: The underlying LLM that powers the analysis and code generation.
-   **Pandas**: Used for efficient data manipulation and analysis of running activities.
-   **Supabase**: (Optional) For persistent storage of chat logs and user profiles.

## 🤖 How AI is Used

Stravify doesn't just "guess" answers. It uses a **ReAct (Reasoning + Acting)** agent workflow:

1.  **Data Loading**: When you log in, the backend fetches your last 200 activities from Strava.
2.  **DataFrame Creation**: These activities are converted into a structured Pandas DataFrame containing metrics like distance, moving time, elevation, and dates.
3.  **Agent Execution**:
    -   When you ask a question, the **LangChain Pandas DataFrame Agent** receives the query.
    -   The agent uses **Google Gemini 2.5 Flash** to reason about the data.
    -   It **generates Python code** (specifically Pandas operations) to calculate the exact answer.
    -   It executes this code in a secure sandboxed environment.
    -   Finally, it interprets the result and returns a friendly, human-readable response.

This approach ensures 100% mathematical accuracy for queries like sums and averages, as the AI isn't doing mental math but rather writing code to solve the problem.

## 📦 Setup & Installation

### Prerequisites
-   Node.js & npm
-   Python 3.10+
-   Strava API Credentials
-   Google AI Studio API Key

### Backend Setup
1.  Navigate to `backend/`:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure `.env`:
    ```env
    STRAVA_CLIENT_ID=your_id
    STRAVA_CLIENT_SECRET=your_secret
    GOOGLE_API_KEY=your_gemini_key
    ```
5.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```

### Frontend Setup
1.  Navigate to `frontend/`:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
