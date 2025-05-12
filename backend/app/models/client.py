from app.extensions import db
from datetime import datetime

class Client(db.Model):
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100))
    email = db.Column(db.String(255))
    notes = db.Column(db.Text)
    is_blocked = db.Column(db.Boolean, default=False)
    blacklist_reason = db.Column(db.Text)
    is_regular = db.Column(db.Boolean, default=False)
    last_contact_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile_clients = db.relationship('ProfileClient', back_populates='client', cascade='all, delete-orphan')
    
    def update_last_contact(self):
        """Update last contact date to now"""
        self.last_contact_date = datetime.utcnow()
        db.session.commit()
    
    @classmethod
    def get_or_create(cls, phone_number):
        """Get existing client or create new one"""
        client = cls.query.filter_by(phone_number=phone_number).first()
        
        if not client:
            client = cls(phone_number=phone_number)
            db.session.add(client)
            db.session.commit()
        
        return client
    
    def to_dict(self):
        """Convert client to dictionary"""
        return {
            'id': self.id,
            'phone_number': self.phone_number,
            'name': self.name,
            'email': self.email,
            'notes': self.notes,
            'is_blocked': self.is_blocked,
            'blacklist_reason': self.blacklist_reason,
            'is_regular': self.is_regular,
            'last_contact_date': self.last_contact_date.isoformat() if self.last_contact_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class ProfileClient(db.Model):
    __tablename__ = 'profile_clients'
    
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    notes = db.Column(db.Text)
    last_contact_date = db.Column(db.DateTime)
    conversation_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Enforce unique constraint on profile_id and client_id
    __table_args__ = (
        db.UniqueConstraint('profile_id', 'client_id'),
    )
    
    # Relationships
    profile = db.relationship('Profile', back_populates='profile_clients')
    client = db.relationship('Client', back_populates='profile_clients')
    
    @classmethod
    def get_or_create(cls, profile_id, client_id):
        """Get existing relationship or create new one"""
        profile_client = cls.query.filter_by(
            profile_id=profile_id,
            client_id=client_id
        ).first()
        
        if not profile_client:
            profile_client = cls(
                profile_id=profile_id,
                client_id=client_id
            )
            db.session.add(profile_client)
            db.session.commit()
        
        return profile_client
    
    def update_last_contact(self):
        """Update last contact date to now"""
        self.last_contact_date = datetime.utcnow()
        self.conversation_count += 1
        db.session.commit()
        
        # Also update the client's last contact date
        self.client.update_last_contact()
    
    def to_dict(self):
        """Convert profile-client relationship to dictionary"""
        return {
            'profile_id': self.profile_id,
            'client_id': self.client_id,
            'notes': self.notes,
            'last_contact_date': self.last_contact_date.isoformat() if self.last_contact_date else None,
            'conversation_count': self.conversation_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }