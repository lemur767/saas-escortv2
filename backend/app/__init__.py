from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from app.config import config
from app.extensions import db, migrate, jwt, socketio, celery

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    cors_config = {
        'origins': app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:5173']),
        'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        'allow_headers': [
            'Content-Type', 
            'Authorization', 
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-CSRF-Token'
        ],
        'supports_credentials': True,
        'expose_headers': ['Content-Range', 'X-Content-Range']
    }
    
    # Initialize CORS with proper configuration
    CORS(app, **cors_config)
    # Initialize extensions in the correct order
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Configure SocketIO with proper CORS
    socketio_cors_config = {
        'cors_allowed_origins': app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:5173']),
        'cors_credentials': True
    }
    socketio.init_app(app, **socketio_cors_config)
    socketio.init_app(app, cors_allowed_origins="*")
    CORS(app)
    
    # Initialize Celery
    celery.conf.update(app.config)
    
    with app.app_context():
        # Import all models to ensure they're registered
        from app.models import init_models
        init_models()
        
        # Initialize scheduler if not in testing mode
        if not app.config.get('TESTING', False):
            try:
                from app.tasks.scheduler import init_scheduler
                init_scheduler(app)
            except ImportError:
                pass  # Skip if scheduler module doesn't exist
    
    # Register blueprints AFTER models are initialized
    register_blueprints(app)
    
    # JWT error handlers
    setup_jwt_handlers()
 # Add CORS headers to all responses (additional safety net)
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        allowed_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:5173'])
        
        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-CSRF-Token')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Expose-Headers', 'Content-Range,X-Content-Range')
        
        return response
    
    # Handle preflight requests
    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == "OPTIONS":
            origin = request.headers.get('Origin')
            allowed_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:5173'])
            
            if origin in allowed_origins:
                response = make_response()
                response.headers.add("Access-Control-Allow-Origin", origin)
                response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-CSRF-Token')
                response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH')
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                
                return response

def register_blueprints(app):
    """Register all API blueprints"""
    from app.api.auth import auth_bp
    from app.api.profiles import profiles_bp
    from app.api.twilio import twilio_bp
    from app.api.messages import messages_bp
    from app.api.webhooks import webhooks_bp
    from app.api.client import clients_bp
    from app.api.billing import billing_bp
    from app.api.text_examples import text_examples_bp
    from app.api.ai_settings import ai_settings_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profiles_bp, url_prefix='/api/profiles')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(clients_bp, url_prefix='/api/clients')
    app.register_blueprint(billing_bp, url_prefix='/api/billing')
    app.register_blueprint(twilio_bp, url_prefix='/api/twilio')
    app.register_blueprint(text_examples_bp, url_prefix='/api/text_examples')
    app.register_blueprint(ai_settings_bp, url_prefix='/api/ai_settings')

def setup_jwt_handlers():
    """Setup JWT error handlers"""
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'message': 'Invalid token'}, 401
