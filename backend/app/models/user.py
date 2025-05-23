from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from datetime import datetime
from cryptography.fernet import Fernet

class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    phone_number = db.Column(db.String(20))
    twilio_account_sid = db.Column(db.String(50))
    twilio_auth_token = db.Column(db.String(100), nullable=True)  # Only stored for subaccounts
    twilio_api_key_sid = db.Column(db.String(50))
    twilio_api_key_secret = db.Column(db.String(100), nullable=True)  # Only stored for subaccounts
    twilio_account_type = db.Column(db.String(20), default='subaccount')  # 'subaccount' or 'external'
    twilio_parent_account = db.Column(db.Boolean, default=True)  # Whether using the parent master account
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Rename columns in User model
    _twilio_auth_token = db.Column(db.String(255), nullable=True)  # Encrypted
    _twilio_api_key_secret = db.Column(db.String(255), nullable=True)  # Encrypted
    
    # Relationships
    profiles = db.relationship('Profile', back_populates='user', lazy='dynamic')
    subscriptions = db.relationship('Subscription', back_populates='user', lazy='dynamic')
    twilio_usage_tracker = db.relationship('TwilioUsage', back_populates='user', uselist=False)
    
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    def encrypt_token(self, token):
        """Encrypt a sensitive token before storing it"""
        if not token:
            return None
        
        key = current_app.config['ENCRYPTION_KEY'].encode()
        cipher = Fernet(key)
        return cipher.encrypt(token.encode()).decode()
    
    def decrypt_token(self, encrypted_token):
        """Decrypt a stored token"""
        if not encrypted_token:
            return None
        
        key = current_app.config['ENCRYPTION_KEY'].encode()
        cipher = Fernet(key)
        return cipher.decrypt(encrypted_token.encode()).decode()
    
    # Override setters and getters for sensitive fields
    @property
    def twilio_auth_token(self):
        return self.decrypt_token(self._twilio_auth_token)
    
    @twilio_auth_token.setter
    def twilio_auth_token(self, token):
        self._twilio_auth_token = self.encrypt_token(token)
    
    @property
    def twilio_api_key_secret(self):
        return self.decrypt_token(self._twilio_api_key_secret)
    
    @twilio_api_key_secret.setter
    def twilio_api_key_secret(self, secret):
        self._twilio_api_key_secret = self.encrypt_token(secret)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone_number': self.phone_number,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'has_twilio_account': bool(self.twilio_account_sid),
            'twilio_account_type': self.twilio_account_type,
            'twilio_parent_account': self.twilio_parent_account
        }

