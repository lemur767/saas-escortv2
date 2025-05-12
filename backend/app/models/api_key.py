from app.extensions import db
from datetime import datetime
import secrets


class APIKey(db.Model):
    __tablename__ = 'api_keys'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    key = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_hex(32))
    name = db.Column(db.String(100))
    permissions = db.Column(db.Text)  # JSON string of permissions
    last_used_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User')
    
    def to_dict(self):
        import json
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'key': self.key[:8] + '...',  # Only expose first 8 chars for security
            'name': self.name,
            'permissions': json.loads(self.permissions) if self.permissions else {},
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }   