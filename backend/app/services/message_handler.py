from app.models.message import Message
from app.models.profile import Profile
from app.models.client import Client
from app.models.auto_reply import AutoReply
from app.models.flagged_message import FlaggedMessage
from app.services.ai_service import generate_ai_response
from app.extensions import db, socketio
from datetime import datetime
import re
import json

# Flag words and phrases to watch for
FLAG_WORDS = [
    "police", "cop", "law enforcement", "arrest", "sting", "setup",
    "underage", "minor", "illegal", "bust"
]

def handle_incoming_message(profile_id, message_text, sender_number):
    """
    Process incoming message and determine appropriate response
    Main message handling function
    """
    # Get profile information
    profile = Profile.query.get(profile_id)
    if not profile:
        return None
    
    # Get or create client record
    client = Client.query.filter_by(phone_number=sender_number).first()
    if not client:
        client = Client(phone_number=sender_number)
        db.session.add(client)
        db.session.commit()
    
    # Check if client is blocked
    if client.is_blocked:
        # Ignore message
        return None
    
    # Save incoming message to database
    message = Message(
        content=message_text,
        is_incoming=True,
        sender_number=sender_number,
        profile_id=profile.id,
        ai_generated=False,
        timestamp=datetime.utcnow()
    )
    db.session.add(message)
    db.session.commit()
    
    # Emit WebSocket event
    socketio.emit('new_message', {
        "id": message.id,
        "content": message.content,
        "is_incoming": message.is_incoming,
        "sender_number": message.sender_number,
        "ai_generated": message.ai_generated,
        "timestamp": message.timestamp.isoformat(),
        "is_read": message.is_read,
        "profile_id": profile.id
    })
    
    # Check if message contains flagged content
    is_flagged, flag_reasons = check_flagged_content(message_text)
    if is_flagged:
        # Save flag information
        flagged_message = FlaggedMessage(
            message_id=message.id,
            reasons=json.dumps(flag_reasons),
            is_reviewed=False
        )
        db.session.add(flagged_message)
        db.session.commit()
    
    # If AI responses are not enabled, just store the message and don't respond
    if not profile.ai_enabled:
        return None
    
    # Check for automatic responses based on keywords
    for auto_reply in AutoReply.query.filter_by(profile_id=profile.id).all():
        if auto_reply.keyword.lower() in message_text.lower():
            return send_response(profile, auto_reply.response, sender_number, is_ai_generated=False)
    
    # Check if within business hours - if not, send "out of office" message
    if not is_within_business_hours(profile):
        out_of_office_reply = profile.out_of_office_replies.first()
        if out_of_office_reply:
            return send_response(profile, out_of_office_reply.message, sender_number, is_ai_generated=False)
    
    # Generate AI response
    ai_response = generate_ai_response(profile, message_text, sender_number)
    if ai_response:
        return send_response(profile, ai_response, sender_number, is_ai_generated=True)
    
    # Fallback response if AI generation fails
    fallback_response = "I'll get back to you soon!"
    return send_response(profile, fallback_response, sender_number, is_ai_generated=False)

def send_response(profile, response_text, recipient_number, is_ai_generated=True):
    """Send response via Twilio and save to database"""
    from app.utils.twilio_helpers import send_sms
    
    # Save outgoing message to database
    message = Message(
        content=response_text,
        is_incoming=False,
        sender_number=recipient_number,
        profile_id=profile.id,
        ai_generated=is_ai_generated,
        timestamp=datetime.utcnow()
    )
    db.session.add(message)
    db.session.commit()
    
    # Send via Twilio
    try:
        twilio_message = send_sms(
            from_number=profile.phone_number,
            to_number=recipient_number,
            body=response_text
        )
        
        # Update message with Twilio SID
        message.twilio_sid = twilio_message.sid
        message.send_status = 'sent'
        db.session.commit()
        
        # Emit WebSocket event
        socketio.emit('new_message', {
            "id": message.id,
            "content": message.content,
            "is_incoming": message.is_incoming,
            "sender_number": message.sender_number,
            "ai_generated": message.ai_generated,
            "timestamp": message.timestamp.isoformat(),
            "is_read": message.is_read,
            "profile_id": profile.id
        })
        
        return message
    except Exception as e:
        # Update message status to reflect sending failure
        message.send_status = 'failed'
        message.send_error = str(e)
        db.session.commit()
        return None

def check_flagged_content(message_text):
    """
    Check if message contains flagged content
    Returns a tuple of (is_flagged, reasons)
    """
    is_flagged = False
    reasons = []
    
    # Convert to lowercase for case-insensitive matching
    lower_text = message_text.lower()
    
    # Check for flag words
    for word in FLAG_WORDS:
        if word.lower() in lower_text:
            is_flagged = True
            reasons.append(f"Contains flagged word: '{word}'")
    
    # Check for explicit prices or services
    price_pattern = r'\$\d+|(\d+)\s*(dollars|usd|hr|hour|session)'
    if re.search(price_pattern, lower_text):
        is_flagged = True
        reasons.append("Contains explicit pricing")
    
    return is_flagged, reasons

def is_within_business_hours(profile):
    """Check if current time is within business hours for profile"""
    # Get current time in profile's timezone
    import pytz
    from datetime import datetime
    
    timezone = pytz.timezone(profile.timezone or 'UTC')
    current_time = datetime.now(timezone)
    
    # Get day of week as lowercase string
    day_of_week = current_time.strftime('%A').lower()
    
    # Get business hours for profile
    business_hours = profile.get_business_hours()
    
    # If no business hours are set, return True (always available)
    if not business_hours:
        return True
    
    # Check if day exists in business hours
    if day_of_week not in business_hours:
        return False
    
    # Parse start and end times
    day_hours = business_hours[day_of_week]
    start_time_str = day_hours["start"]
    end_time_str = day_hours["end"]
    
    start_hour, start_minute = map(int, start_time_str.split(':'))
    end_hour, end_minute = map(int, end_time_str.split(':'))
    
    start_time = current_time.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
    
    # Handle cases where end time is on the next day
    if end_hour < start_hour:
        end_time = current_time.replace(hour=end_hour, minute=end_minute, second=0, microsecond=0) + datetime.timedelta(days=1)
    else:
        end_time = current_time.replace(hour=end_hour, minute=end_minute, second=0, microsecond=0)
    
    return start_time <= current_time <= end_time

def mark_messages_as_read(profile_id, sender_number):
    """Mark all unread messages from sender as read"""
    unread_messages = Message.query.filter(
        Message.profile_id == profile_id,
        Message.sender_number == sender_number,
        Message.is_incoming == True,
        Message.is_read == False
    ).all()
    
    for msg in unread_messages:
        msg.is_read = True
    
    db.session.commit()
    return len(unread_messages)
