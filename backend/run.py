#!/usr/bin/env python3
"""
Application runner for the SMS AI Responder Flask application.
This file serves as the main entry point for running the application in development.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.extensions import socketio

def main():
    """Main function to run the application"""
    
    # Get configuration name from environment
    config_name = os.getenv('FLASK_ENV', 'development')
    
    print(f"Starting SMS AI Responder in {config_name} mode...")
    
    try:
        # Create the Flask application
        app = create_app(config_name)
        
        # Print some basic info
        print(f"App created successfully")
        
        print(f"Database URI: {app.config.get('DATABASE_URL', 'Not configured')}")
        
        # Run the application
        if config_name == 'development':
            print("Starting development server with SocketIO...")
            print("Access the application at: http://localhost:5173")
            print("Press CTRL+C to stop the server")
            
            socketio.run(
                app, 
                host='0.0.0.0', 
                port=int(os.getenv('PORT', 5000)), 
                debug=True,
                allow_unsafe_werkzeug=True
            )
        else:
            print("For production, use: gunicorn --worker-class eventlet -w 1 run:app")
            print("Starting basic Flask server...")
            app.run(
                host='0.0.0.0', 
                port=int(os.getenv('PORT', 5000)),
                debug=False
            )
            
    except Exception as e:
        print(f"Error starting application: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()