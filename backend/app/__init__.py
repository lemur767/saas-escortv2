from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app.tasks.scheduler import init_scheduler


# Clear the SQLAlchemy registry to prevent duplicate table errors during development

from app.config import config
from app.extensions import db, migrate, jwt, socketio, celery

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
 
  
    db.init_app(app)
    
    with app.app_context():
        # Import all models from the central location
        from app.models import init_models
        init_models() 
        # Force SQLAlchemy to configure all mappers
    from sqlalchemy.orm import configure_mappers
    configure_mappers()
    
   
    if not app.config.get('TESTING', False):
        with app.app_context():
            init_scheduler(app)
  
    
    
    CORS(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    
   
    celery.conf.update(app.config)
    
    # Register blueprints
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
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback():
        return {'message': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'message': 'Invalid token'}, 401
    
    return app
