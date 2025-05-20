from app.extensions import db
from datetime import datetime


class FlaggedMessage(db.Model):
    __tablename__ = 'flagged_messages'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    reasons = db.Column(db.Text)  # JSON string of reasons
    is_reviewed = db.Column(db.Boolean, default=False)
    review_notes = db.Column(db.Text)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    message = db.relationship('Message', back_populates='flagged_message')
    reviewer = db.relationship('User')
    
    def to_dict(self):
        import json
        
        return {
            'id': self.id,
            'message_id': self.message_id,
            'reasons': json.loads(self.reasons) if self.reasons else [],
            'is_reviewed': self.is_reviewed,
            'review_notes': self.review_notes,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat()
        }