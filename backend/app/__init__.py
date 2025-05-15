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
    
    with app.app_context():
        from app.utils.db_init import init_default_data
        init_default_data()
    
    # Initialize extensions
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    
    # Initialize Celery
    celery.conf.update(app.config)
    
    # Register blueprints
    from app.api.auth import auth_bp
    from app.api.profiles import profiles_bp
    from app.api.messages import messages_bp
    from app.api.webhooks import webhooks_bp
    from app.api.clients import clients_bp
    from app.api.billing import billing_bp
    from app.api.text_examples import text_examples_bp  
    from app.api.ai_settings import ai_settings_bp 
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profiles_bp, url_prefix='/api/profiles')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(clients_bp, url_prefix='/api/clients')
    app.register_blueprint(billing_bp, url_prefix='/api/billing')
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
