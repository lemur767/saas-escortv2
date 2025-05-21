from app.extensions import db
from datetime import datetime

class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    stripe_payment_method_id = db.Column(db.String(100), nullable=False)
    card_last4 = db.Column(db.String(4))
    card_brand = db.Column(db.String(20))
    card_exp_month = db.Column(db.Integer)
    card_exp_year = db.Column(db.Integer)
    
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User')
    
    # Direct subscriptions where this is the primary payment method
    primary_subscriptions = db.relationship(
        'Subscription', 
        foreign_keys='Subscription.payment_method_id',
        backref=db.backref('primary_payment_method', uselist=False)
    )
    
    # The many-to-many relationship is handled via backref from Subscription
    
    def is_expired(self):
        """Check if the payment method has expired"""
        now = datetime.utcnow()
        return (self.card_exp_year < now.year) or (self.card_exp_year == now.year and self.card_exp_month < now.month)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'stripe_payment_method_id': self.stripe_payment_method_id,
            'card_last4': self.card_last4,
            'card_brand': self.card_brand,
            'card_exp_month': self.card_exp_month,
            'card_exp_year': self.card_exp_year,
            'is_default': self.is_default,
            'is_active': self.is_active,
            'is_expired': self.is_expired(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }