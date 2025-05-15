"""
API blueprints package initialization.
This file provides utilities for registering API blueprints.
"""

from flask import Blueprint

# Import all blueprints
from app.api.auth import auth_bp
from app.api.profiles import profiles_bp
from app.api.messages import messages_bp
from app.api.webhooks import webhooks_bp
from app.api.clients import clients_bp
from app.api.billing import billing_bp
from app.api.text_examples import text_examples_bp
from app.api.ai_settings import ai_settings_bp

# List of all available blueprints with their URL prefixes
BLUEPRINTS = [
    (auth_bp, '/api/auth'),
    (profiles_bp, '/api/profiles'),
    (messages_bp, '/api/messages'),
    (webhooks_bp, '/api/webhooks'),
    (clients_bp, '/api/clients'),
    (billing_bp, '/api/billing'),
    (text_examples_bp, '/api/text_examples'),
    (ai_settings_bp, '/api/ai_settings'),
]

def register_blueprints(app):
    """Register all blueprints with the Flask application."""
    for blueprint, url_prefix in BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix=url_prefix)
        
    # Log registered blueprints
    app.logger.info(f"Registered {len(BLUEPRINTS)} API blueprints")

def get_blueprint_by_name(name):
    """Get a blueprint by its name."""
    blueprint_map = {
        'auth': auth_bp,
        'profiles': profiles_bp,
        'messages': messages_bp,
        'webhooks': webhooks_bp,
        'clients': clients_bp,
        'billing': billing_bp,
        'text_examples': text_examples_bp,
        'ai_settings': ai_settings_bp,
    }
    return blueprint_map.get(name)

# Create a main API blueprint that includes all sub-blueprints
main_api = Blueprint('api', __name__)

# You can use this to group multiple blueprints under a single parent
def create_api_blueprint():
    """Create a main API blueprint with all sub-blueprints registered."""
    api = Blueprint('api', __name__)
    
    # Register all blueprints under the main API blueprint
    for blueprint, url_prefix in BLUEPRINTS:
        api.register_blueprint(blueprint, url_prefix=url_prefix.replace('/api', ''))
    
    return api

__all__ = [
    'auth_bp',
    'profiles_bp',
    'messages_bp',
    'webhooks_bp',
    'clients_bp',
    'billing_bp',
    'text_examples_bp',
    'ai_settings_bp',
    'BLUEPRINTS',
    'register_blueprints',
    'get_blueprint_by_name',
    'create_api_blueprint'
]