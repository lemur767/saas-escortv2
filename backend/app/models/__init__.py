"""
Database models package initialization.
This file imports all models for easy access throughout the application.
"""

# Import all models
from app.models.user import User
from app.models.profile import Profile
from app.models.message import Message
from app.models.client import Client, ProfileClient
from app.models.subscription import SubscriptionPlan, Subscription
from app.models.payment import PaymentMethod, Invoice
from app.models.flagged_message import FlaggedMessage
from app.models.text_example import TextExample
from app.models.auto_reply import AutoReply, OutOfOfficeReply
from app.models.ai_model_settings import AIModelSettings
from app.models.usage import UsageRecord, ActivityLog
from app.models.banned_words import BannedWord
from app.models.api_key import APIKey

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