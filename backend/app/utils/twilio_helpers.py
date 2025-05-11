from twilio.rest import Client
from flask import current_app

def get_twilio_client():
    """Get configured Twilio client"""
    return Client(
        current_app.config['TWILIO_ACCOUNT_SID'],
        current_app.config['TWILIO_AUTH_TOKEN']
    )

def send_sms(from_number, to_number, body):
    """Send SMS using Twilio"""
    client = get_twilio_client()
    
    message = client.messages.create(
        body=body,
        from_=from_number,
        to=to_number
    )
    
    return message

def validate_twilio_request(request):
    """Validate that request came from Twilio"""
    if not current_app.config['VERIFY_TWILIO_SIGNATURE']:
        return True
        
    from twilio.request_validator import RequestValidator
    
    # Get Twilio signature from request headers
    twilio_signature = request.headers.get('X-Twilio-Signature', '')
    
    # Create validator
    validator = RequestValidator(current_app.config['TWILIO_AUTH_TOKEN'])
    
    # Validate request
    return validator.validate(
        request.url,
        request.form,
        twilio_signature
    )
