from flask import Blueprint, request, current_app
from app.utils.twilio_helpers import validate_twilio_request
from app.services.message_handler import handle_incoming_message
from app.models.profile import Profile
from app.extensions import task_queue

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.route('/sms', methods=['POST'])
def sms_webhook():
    """Webhook for incoming SMS messages from Twilio"""
    # Validate Twilio request
    if not validate_twilio_request(request):
        current_app.logger.warning("Invalid Twilio signature")
        return 'Invalid request signature', 403
    
    # Extract message details
    message_text = request.form.get('Body', '').strip()
    sender_number = request.form.get('From', '')
    recipient_number = request.form.get('To', '')
    
    # Find which profile this message is for based on the recipient number
    profile = Profile.query.filter_by(phone_number=recipient_number).first()
    if not profile:
        current_app.logger.warning(f"Received message for unknown number: {recipient_number}")
        return '', 204
    
    # Process message asynchronously
    task_queue.enqueue(
        handle_incoming_message,
        profile.id,
        message_text,
        sender_number
    )
    
    # Return empty response to Twilio
    return '', 204

