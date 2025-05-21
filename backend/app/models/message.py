from app.extensions import db
from datetime import datetime
import json

class Message(db.Model):
    __tablename__ = 'messages'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False)
    sender_number = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_incoming = db.Column(db.Boolean, nullable=False)  # True if from client, False if from profile
    ai_generated = db.Column(db.Boolean, default=False)
    is_read = db.Column(db.Boolean, default=False)
    twilio_sid = db.Column(db.String(50))
    send_status = db.Column(db.String(20))  # 'sent', 'delivered', 'failed'
    send_error = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = db.relationship('Profile', back_populates='messages')
  
    flagged_message = db.relationship(
        'FlaggedMessage',
        foreign_keys='FlaggedMessage.message_id',
        uselist=False,
        backref=db.backref('message', lazy='joined')
    )
    
    def is_flagged(self):
        """Check if this message has been flagged"""
        return self.flagged_message is not None
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'is_incoming': self.is_incoming,
            'sender_number': self.sender_number,
            'profile_id': self.profile_id,
            'ai_generated': self.ai_generated,
            'is_read': self.is_read,
            'twilio_sid': self.twilio_sid,
            'send_status': self.send_status,
            'send_error': self.send_error,
            'timestamp': self.timestamp.isoformat(),
            'created_at': self.created_at.isoformat(),
            'is_flagged': self.is_flagged()
        }
    @classmethod
    def create_incoming(cls, profile_id, sender_number, content):
        """Create an incoming message"""
        message = cls(
            profile_id=profile_id,
            sender_number=sender_number,
            content=content,
            is_incoming=True,
            is_read=False
        )
        db.session.add(message)
        db.session.commit()
        
        # Update profile-client relationship
        from app.models.client import Client, ProfileClient
        client = Client.get_or_create(sender_number)
        profile_client = ProfileClient.get_or_create(profile_id, client.id)
        profile_client.update_last_contact()
        
        return message
    
    @classmethod
    def create_outgoing(cls, profile_id, recipient_number, content, ai_generated=False, twilio_sid=None):
        """Create an outgoing message"""
        message = cls(
            profile_id=profile_id,
            sender_number=recipient_number,
            content=content,
            is_incoming=False,
            ai_generated=ai_generated,
            is_read=True,
            twilio_sid=twilio_sid,
            send_status='sent'
        )
        db.session.add(message)
        db.session.commit()
        
        # Update profile-client relationship
        from app.models.client import Client, ProfileClient
        client = Client.get_or_create(recipient_number)
        profile_client = ProfileClient.get_or_create(profile_id, client.id)
        profile_client.update_last_contact()
        
        # Track AI usage if AI-generated
        if ai_generated:
            from app.models.subscription import Subscription
            from app.models.billing import UsageRecord
            
            # Get user's active subscription
            from app.models.profile import Profile
            profile = Profile.query.get(profile_id)
            subscription = profile.user.get_active_subscription()
            
            if subscription:
                # Increment AI responses used
                subscription.increment_ai_responses()
                
                # Record usage
                UsageRecord.record_usage(
                    subscription_id=subscription.id,
                    profile_id=profile_id,
                    ai_responses=1,
                    messages_sent=1
                )
        
        return message
    
    @classmethod
    def mark_all_read(cls, profile_id, sender_number):
        """Mark all messages from sender as read"""
        unread_count = cls.query.filter_by(
            profile_id=profile_id,
            sender_number=sender_number,
            is_incoming=True,
            is_read=False
        ).update({'is_read': True})
        
        db.session.commit()
        return unread_count
    
    def update_status(self, status, error=None):
        """Update message send status"""
        self.send_status = status
        self.send_error = error
        db.session.commit()
    
    def flag_message(self, reasons):
        """Flag message for review"""
        if self.flagged_message:
            self.flagged_message.reasons = json.dumps(reasons)
            self.flagged_message.is_reviewed = False
            self.flagged_message.review_notes = None
            self.flagged_message.review_date = None
            self.flagged_message.reviewed_by = None
        else:
            from app.models.flagged_message import FlaggedMessage
            flagged = FlaggedMessage(
                message_id=self.id,
                reasons=json.dumps(reasons)
            )
            db.session.add(flagged)
        
        db.session.commit()
    
    def to_dict(self):
        """Convert message to dictionary"""
        result = {
            'id': self.id,
            'profile_id': self.profile_id,
            'sender_number': self.sender_number,
            'content': self.content,
            'is_incoming': self.is_incoming,
            'ai_generated': self.ai_generated,
            'is_read': self.is_read,
            'send_status': self.send_status,
            'timestamp': self.timestamp.isoformat(),
            'is_flagged': bool(self.flagged_message)
        }
        
        if self.flagged_message:
            result['flag_reasons'] = json.loads(self.flagged_message.reasons)
            result['flag_reviewed'] = self.flagged_message.is_reviewed
        
        return result


