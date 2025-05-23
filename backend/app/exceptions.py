class TwilioError(Exception):
    """Base exception for Twilio-related errors"""
    pass

class TwilioAccountError(TwilioError):
    """Exception for Twilio account creation/management errors"""
    pass

class TwilioNumberError(TwilioError):
    """Exception for phone number-related errors"""
    pass

class TwilioBillingError(TwilioError):
    """Exception for billing-related errors"""
    pass
