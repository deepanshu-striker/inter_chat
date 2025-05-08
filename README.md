# Real-time Audio Response Service

This project is a full-stack application that provides real-time audio recording, transcription, and AI-powered responses. It includes a landing page with pricing plans and a voice chat application.

## Features

- **Real-time Audio Processing:** Record audio, get instant transcription, and receive AI responses.
- **Google Authentication:** Secure user login and registration via Google Sign-In.
- **Dynamic Waveform Visualization:** Visual feedback during audio recording.
- **Subscription Management:**
    - Free: 50 responses
    - Pro: ₹499 for 300 responses (monthly)
    - Business: ₹1599 for 2000 responses (monthly)
- **User Dashboard:** Displays real-time statistics for responses used and remaining.
- **Plan Upgrade System:** Users can upgrade their plan when they need more responses.
- **Business Rules Implementation:**
    - Users can only upgrade plans, never downgrade
    - Clear visual indicators for current plan and available upgrades
    - Automatic response counting and quota enforcement

## Project Structure

### Frontend
- `frontend/src/components/`: React components including VoiceChat and WaveformVisualizer
- `frontend/src/components/landing/`: Landing page components (Header, Hero, Pricing, etc.)
- `frontend/src/context/`: Context providers for state management
- `frontend/src/firebase/`: Firebase configuration and authentication utilities
- `frontend/src/pages/`: Page components for routing
- `frontend/src/styles/`: CSS styles for components

### Backend
- `backend/main.py`: FastAPI server with endpoints for authentication, transcription, and chat
- `backend/agent.py`: AI agent for processing chat requests
- `backend/utils/`: Utility functions for audio processing and transcription

## Setup and Installation

### Prerequisites
- Node.js and npm
- Python 3.11+
- Docker and Docker Compose (for containerized deployment)
- Firebase project with Google Authentication enabled

### Environment Setup
1. Clone the repository
2. Create a `.env` file based on `.env.example` with your API keys
3. Set up Firebase credentials for authentication

### Development
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Run frontend development server
cd frontend
npm run dev

# Run backend development server
cd backend
python main.py
```

### Production Deployment
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build
```

## Current Status and Future Development

### Completed
- ✅ Google Authentication integration
- ✅ Backend system for user management and response tracking
- ✅ Real-time audio recording, transcription, and chat functionality
- ✅ User dashboard with usage statistics
- ✅ Subscription plan management with business rules
- ✅ Dynamic waveform visualization

### Planned Enhancements
- Implement actual payment gateway integration for subscriptions
- Add more AI model options for different response styles
- Implement voice response using text-to-speech
- Add user settings for customizing the experience
- Create admin dashboard for monitoring usage and user statistics
- Implement multi-language support
