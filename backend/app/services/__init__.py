"""
Business logic services package initialization.
This file imports all service modules for easy access.
"""

# Import all services
from app.services.message_handler import (
    handle_incoming_message,
    send_response,
    check_flagged_content,
    is_within_business_hours,
    mark_messages_as_read
)

from app.services.ai_service import (
    generate_ai_response,
    get_conversation_history,
    create_system_prompt
)

from app.services.analytics_service import AnalyticsService
from app.services.billing_service import BillingService
from app.services.supabase_service import SupabaseService

# Service registry for easy access
SERVICES = {
    'message_handler': {
        'handle_incoming_message': handle_incoming_message,
        'send_response': send_response,
        'check_flagged_content': check_flagged_content,
        'is_within_business_hours': is_within_business_hours,
        'mark_messages_as_read': mark_messages_as_read
    },
    'ai_service': {
        'generate_ai_response': generate_ai_response,
        'get_conversation_history': get_conversation_history,
        'create_system_prompt': create_system_prompt
    },
    'analytics': AnalyticsService,
    'billing': BillingService,
    'supabase': SupabaseService
}

def get_service(service_name):
    """Get a service by name."""
    return SERVICES.get(service_name)

def get_service_function(service_name, function_name):
    """Get a specific function from a service."""
    service = SERVICES.get(service_name)
    if service and isinstance(service, dict):
        return service.get(function_name)
    elif hasattr(service, function_name):
        return getattr(service, function_name)
    return None

class ServiceManager:
    """Manager class for all services."""
    
    @staticmethod
    def initialize_services(app):
        """Initialize all services with the Flask app context."""
        with app.app_context():
            # Initialize any services that need app context
            pass
    
    @staticmethod
    def get_analytics():
        """Get the analytics service instance."""
        return AnalyticsService()
    
    @staticmethod
    def get_billing():
        """Get the billing service instance."""
        return BillingService()
    
    @staticmethod
    def get_supabase():
        """Get the Supabase service instance."""
        return SupabaseService()

__all__ = [
    # Message handling functions
    'handle_incoming_message',
    'send_response',
    'check_flagged_content',
    'is_within_business_hours',
    'mark_messages_as_read',
    
    # AI service functions
    'generate_ai_response',
    'get_conversation_history',
    'create_system_prompt',
    
    # Service classes
    'AnalyticsService',
    'BillingService',
    'SupabaseService',
    
    # Utility functions and classes
    'SERVICES',
    'get_service',
    'get_service_function',
    'ServiceManager'
]