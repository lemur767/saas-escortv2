from app.extensions import db
from datetime import datetime
import json

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
    
   
   
 
    reviewer = db.relationship('User')
    
    def get_reasons(self):
        if not self.reasons:
            return []
        return json.loads(self.reasons)
    
    def set_reasons(self, reasons_list):
        self.reasons = json.dumps(reasons_list)
    
    def to_dict(self):
        message_obj = self.message  # This uses the property
        
        return {
            'id': self.id,
            'message_id': self.message_id,
            'message_content': message_obj.content if message_obj else None,
            'reasons': self.get_reasons(),
            'is_reviewed': self.is_reviewed,
            'reviewer_id': self.reviewer_id,
            'review_notes': self.review_notes,
            'review_date': self.review_date.isoformat() if self.review_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
