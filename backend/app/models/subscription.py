from app.extensions import db
from datetime import datetime, timedelta
import json

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)
    stripe_subscription_id = db.Column(db.String(100))
    stripe_customer_id = db.Column(db.String(100))
    payment_method_id = db.Column(db.Integer, db.ForeignKey('payment_methods.id'))
    
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    renewal_date = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    payment_status = db.Column(db.String(20), default='active')  # active, past_due, failed, canceled
    
    auto_renew = db.Column(db.Boolean, default=True)
    subscription_metadata = db.Column(db.Text)  # JSON field for additional data
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='subscriptions')
    plan = db.relationship('SubscriptionPlan')
    
    # Singular relationship to the primary payment method
    payment_method = db.relationship('PaymentMethod', foreign_keys=[payment_method_id])
    
    # Plural relationship to all payment methods associated with this subscription
    # This might be useful if you want to track all payment methods ever used
    payment_methods = db.relationship(
        'PaymentMethod',
        secondary='subscription_payment_methods',
        backref=db.backref('subscriptions', lazy='dynamic'),
        lazy='dynamic'
    )
    
    invoices = db.relationship('Invoice', back_populates='subscription', lazy='dynamic')
    
    def set_metadata(self, metadata_dict):
        self.subscription_metadata = json.dumps(metadata_dict)
    
    def get_metadata(self):
        if not self.subscription_metadata:
            return {}
        return json.loads(self.subscription_metadata)
    
    def get_current_period_start(self):
        """Get the start date of the current billing period"""
        # If we have a stored renewal date, use one period before that
        if self.renewal_date:
            if self.plan.billing_cycle == 'monthly':
                return self.renewal_date - timedelta(days=30)
            elif self.plan.billing_cycle == 'yearly':
                return self.renewal_date - timedelta(days=365)
            else:
                return self.start_date
        
        # Otherwise, use the subscription start date
        return self.start_date
    
    def get_current_period_end(self):
        """Get the end date of the current billing period"""
        # If we have a stored renewal date, use that
        if self.renewal_date:
            return self.renewal_date
        
        # Otherwise, calculate based on start date and billing cycle
        if self.plan.billing_cycle == 'monthly':
            return self.start_date + timedelta(days=30)
        elif self.plan.billing_cycle == 'yearly':
            return self.start_date + timedelta(days=365)
        else:
            # Default to 30 days for unknown billing cycles
            return self.start_date + timedelta(days=30)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan_id': self.plan_id,
            'plan': self.plan.to_dict() if self.plan else None,
            'stripe_subscription_id': self.stripe_subscription_id,
            'stripe_customer_id': self.stripe_customer_id,
            'payment_method_id': self.payment_method_id,
            'payment_method': self.payment_method.to_dict() if self.payment_method else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'renewal_date': self.renewal_date.isoformat() if self.renewal_date else None,
            'is_active': self.is_active,
            'payment_status': self.payment_status,
            'auto_renew': self.auto_renew,
            'subscription_metadata': self.get_metadata(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'current_period': {
                'start': self.get_current_period_start().isoformat(),
                'end': self.get_current_period_end().isoformat()
            }
        }