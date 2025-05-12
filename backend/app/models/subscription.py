from app.extensions import db
from datetime import datetime
import json

class SubscriptionPlan(db.Model):
    __tablename__ = 'subscription_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    profile_limit = db.Column(db.Integer, nullable=False)
    ai_responses_limit = db.Column(db.Integer, nullable=False)
    message_history_days = db.Column(db.Integer, nullable=False)
    features = db.Column(db.Text, nullable=False)  # JSON array of features
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = db.relationship('Subscription', back_populates='plan')
    
    def __init__(self, **kwargs):
        if 'features' in kwargs and isinstance(kwargs['features'], list):
            kwargs['features'] = json.dumps(kwargs['features'])
        super(SubscriptionPlan, self).__init__(**kwargs)
    
    @property
    def features_list(self):
        """Return features as list"""
        if self.features:
            return json.loads(self.features)
        return []
    
    def to_dict(self):
        """Convert plan to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'price': float(self.price),
            'profile_limit': self.profile_limit,
            'ai_responses_limit': self.ai_responses_limit,
            'message_history_days': self.message_history_days,
            'features': self.features_list,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'active', 'canceled', 'past_due'
    stripe_customer_id = db.Column(db.String(100))
    stripe_subscription_id = db.Column(db.String(100))
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    trial_end_date = db.Column(db.DateTime)
    ai_responses_used = db.Column(db.Integer, default=0)
    cancellation_date = db.Column(db.DateTime)
    cancellation_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='subscriptions')
    plan = db.relationship('SubscriptionPlan', back_populates='subscriptions')
    invoices = db.relationship('Invoice', back_populates='subscription')
    usage_records = db.relationship('UsageRecord', back_populates='subscription', cascade='all, delete-orphan')
    
    def increment_ai_responses(self, count=1):
        """Increment AI responses used count"""
        self.ai_responses_used += count
        db.session.commit()
    
    def is_limit_reached(self):
        """Check if AI response limit is reached"""
        return self.ai_responses_used >= self.plan.ai_responses_limit
    
    def get_usage_percentage(self):
        """Get percentage of AI responses used"""
        if self.plan.ai_responses_limit == 0:
            return 0
        return min(100, int((self.ai_responses_used / self.plan.ai_responses_limit) * 100))
    
    def to_dict(self):
        """Convert subscription to dictionary"""
        return {
            'id': self.id,
            'plan': self.plan.to_dict(),
            'status': self.status,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'trial_end_date': self.trial_end_date.isoformat() if self.trial_end_date else None,
            'ai_responses_used': self.ai_responses_used,
            'usage_percentage': self.get_usage_percentage(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }