"""
Database models package initialization.
This file imports all models for easy access throughout the application.
"""
from app.extensions import db


# Define a function to import all models
def import_all_models():
    # Import models here - only called once by the app
    from app.models.user import User
    from app.models.profile import Profile
    from app.models.client import Client
    from app.models.profile_client import ProfileClient
    from app.models.payment import PaymentMethod
    from app.models.twilio_usage import TwilioUsage
    from app.models.subscription_payment_method import SubscriptionPaymentMethod
    from app.models.billing import Invoice, SubscriptionPlan, Subscription, InvoiceItem
    from app.models.message import Message
    from app.models.flagged_message import FlaggedMessage
    from app.models.text_example import TextExample
    from app.models.auto_reply import AutoReply
    from app.models.ai_model_settings import AIModelSettings
    from app.models.usage import UsageRecord
    
    # Return a dictionary of all models
    return {
        'User': User,
        'Profile': Profile,
        'Client': Client,
        'ProfileClient': ProfileClient,
        'SubscriptionPlan': SubscriptionPlan,
        'PaymentMethod': PaymentMethod,
        'Subscription': Subscription,
        'SubscriptionPaymentMethod': SubscriptionPaymentMethod,
        'TwilioUsage':TwilioUsage,
        'Invoice': Invoice,
        'InvoiceItem':InvoiceItem,
        'Message': Message,
        'FlaggedMessage': FlaggedMessage,
        'TextExample': TextExample,
        'AutoReply': AutoReply,
        'AIModelSettings': AIModelSettings,
        'UsageRecord': UsageRecord
    }

# Create a variable for import from other modules
models = None

def init_models():
    """Initialize models once at application startup"""
    global models
    if models is None:
        models = import_all_models()
    return models

from sqlalchemy.orm import configure_mappers
configure_mappers()

# List of all model classes for easy iteration
__all__ = [
    'User',
    'Profile',
    'Message',
    'Client',
    'ProfileClient',
    'SubscriptionPlan',
    'Subscription',
    'PaymentMethod',
    'Invoice',
    'FlaggedMessage',
    'TextExample',
    'AutoReply',
    'OutOfOfficeReply',
    'AIModelSettings',
    'UsageRecord',
    'ActivityLog',
    'BannedWord',
    'APIKey'
]

# Database tables in dependency order (for creating/dropping)
DEPENDENCY_ORDER = [
    'BannedWord',
    'SubscriptionPlan',
    'User',
    'Profile',
    'Subscription',
    'PaymentMethod',
    'Invoice',
    'Client',
    'ProfileClient',
    'Message',
    'FlaggedMessage',
    'TextExample',
    'AutoReply',
    'OutOfOfficeReply',
    'AIModelSettings',
    'UsageRecord',
    'ActivityLog',
    'APIKey'
]

def get_model_by_name(name):
    """Get a model class by its string name."""
    return globals().get(name)

def get_all_models():
    """Get all model classes as a dictionary."""
    return {name: globals()[name] for name in __all__}