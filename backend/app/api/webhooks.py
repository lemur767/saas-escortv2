from flask import Blueprint, request, current_app, Response
from app.utils.twilio_helpers import validate_twilio_request
from app.service.message_handler import handle_incoming_message
from app.models.profile import Profile
from app.extensions import db, celery
from celery import uuid
import logging

webhooks_bp = Blueprint('webhooks', __name__)
logger = logging.getLogger(__name__)

@webhooks_bp.route('/sms', methods=['POST'])
def sms_webhook():
    """
    Webhook endpoint for incoming SMS messages from Twilio.
    This is called when someone sends an SMS to your Twilio number.
    """
    try:
        # Validate that the request is from Twilio
        if not validate_twilio_request(request):
            logger.warning("Invalid Twilio signature")
            return Response('Invalid request signature', status=403)
        
        # Extract message details from Twilio webhook
        message_data = {
            'body': request.form.get('Body', '').strip(),
            'from': request.form.get('From', ''),
            'to': request.form.get('To', ''),
            'message_sid': request.form.get('MessageSid', ''),
            'account_sid': request.form.get('AccountSid', ''),
            'from_country': request.form.get('FromCountry', ''),
            'from_state': request.form.get('FromState', ''),
            'from_city': request.form.get('FromCity', ''),
            'from_zip': request.form.get('FromZip', ''),
            'to_country': request.form.get('ToCountry', ''),
            'to_state': request.form.get('ToState', ''),
            'to_city': request.form.get('ToCity', ''),
            'to_zip': request.form.get('ToZip', ''),
        }
        
        logger.info(f"Received SMS: {message_data['from']} -> {message_data['to']}: {message_data['body']}")
        
        # Find which profile this message is for based on the recipient number
        profile = Profile.query.filter_by(phone_number=message_data['to']).first()
        if not profile:
            logger.warning(f"Received message for unknown number: {message_data['to']}")
            return Response('', status=204)
        
        # Process message asynchronously using Celery
        task_id = str(uuid())
        process_sms_task.apply_async(
            args=[profile.id, message_data],
            task_id=task_id
        )
        
        logger.info(f"Queued SMS processing task {task_id} for profile {profile.id}")
        
        # Return empty response immediately to Twilio (required)
        return Response('', status=204)
        
    except Exception as e:
        logger.error(f"Error in SMS webhook: {str(e)}", exc_info=True)
        return Response('Internal Server Error', status=500)


@celery.task(bind=True, name='process_sms_task')
def process_sms_task(self, profile_id, message_data):
    """
    Celery task to process incoming SMS asynchronously.
    This allows the webhook to return immediately to Twilio.
    """
    try:
        logger.info(f"Processing SMS task for profile {profile_id}")
        
        # Process the message (this will handle AI response and sending)
        result = handle_incoming_message(
            profile_id=profile_id,
            message_text=message_data['body'],
            sender_number=message_data['from'],
            message_data=message_data
        )
        
        if result:
            logger.info(f"Successfully processed SMS for profile {profile_id}")
        else:
            logger.warning(f"No response generated for SMS to profile {profile_id}")
            
        return {'status': 'success', 'profile_id': profile_id}
        
    except Exception as e:
        logger.error(f"Error processing SMS task: {str(e)}", exc_info=True)
        self.retry(countdown=60, max_retries=3)