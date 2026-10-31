#!/bin/bash

# Start services script for ProjectUp

echo "Starting ProjectUp services..."

# Function to kill processes on exit
cleanup() {
    echo "Stopping services..."
    kill $AI_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start AI Agent
echo "Starting AI Agent on port 8000..."
cd ai-service
python main.py serve > ../ai-agent.log 2>&1 &
AI_PID=$!
cd ..

# Wait for AI Agent to start
sleep 3

# Start Backend
echo "Starting Backend on port 8080..."
cd backend
go run main.go > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for Backend to start  
sleep 3

# Start Frontend
echo "Starting Frontend on port 5173..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "All services started!"
echo "AI Agent PID: $AI_PID (port 8000)"
echo "Backend PID: $BACKEND_PID (port 8080)"
echo "Frontend PID: $FRONTEND_PID (port 5173)"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait