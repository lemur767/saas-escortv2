from app.extensions import db
from datetime import datetime
import json

class SubscriptionPlan(db.Model):
    __tablename__ = 'subscription_plans'
    __table_args__ = {'extend_existing': True}
    
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
class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id'), nullable=False)
    stripe_invoice_id = db.Column(db.String(100), unique=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # Amount and currency
    amount_due = db.Column(db.Numeric(10, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(10, 2), default=0)
    currency = db.Column(db.String(3), default='USD')
    tax_amount = db.Column(db.Numeric(10, 2), default=0)
    
    # Status and dates
    status = db.Column(db.String(20), default='draft')  # draft, open, paid, void, uncollectible
    billing_reason = db.Column(db.String(50))  # subscription_create, subscription_cycle, etc.
    
    # Important dates
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    period_start = db.Column(db.DateTime)
    period_end = db.Column(db.DateTime)
    due_date = db.Column(db.DateTime)
    paid_at = db.Column(db.DateTime)
    voided_at = db.Column(db.DateTime)
    
    # Additional details
    description = db.Column(db.Text)
    invoice_pdf_url = db.Column(db.String(500))  # URL to PDF from Stripe
    hosted_invoice_url = db.Column(db.String(500))  # Stripe hosted invoice page
    
    # Metadata for additional info
    invoice_metadata = db.Column(db.Text)  # JSON string for flexible data storage
    
    # Relationships
    subscription = db.relationship('Subscription', back_populates='invoices')
    invoice_items = db.relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')
    
    def get_metadata(self):
        """Get metadata as a dictionary"""
        if not self.invoice_metadata:
            return {}
        return json.loads(self.invoice_metadata)
    
    def set_metadata(self, metadata_dict):
        """Set metadata from a dictionary"""
        self.invoice_metadata = json.dumps(metadata_dict)
    
    def is_paid(self):
        """Check if invoice is fully paid"""
        return self.status == 'paid' and self.amount_paid >= self.amount_due
    
    def is_overdue(self):
        """Check if invoice is overdue"""
        if not self.due_date or self.is_paid():
            return False
        return datetime.utcnow() > self.due_date
    
    def get_balance_due(self):
        """Get remaining balance due"""
        return max(0, float(self.amount_due) - float(self.amount_paid or 0))
    
    def mark_as_paid(self, amount_paid=None, paid_at=None):
        """Mark invoice as paid"""
        self.amount_paid = amount_paid or self.amount_due
        self.paid_at = paid_at or datetime.utcnow()
        self.status = 'paid'
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'subscription_id': self.subscription_id,
            'stripe_invoice_id': self.stripe_invoice_id,
            'invoice_number': self.invoice_number,
            'amount_due': float(self.amount_due),
            'amount_paid': float(self.amount_paid or 0),
            'currency': self.currency,
            'tax_amount': float(self.tax_amount or 0),
            'status': self.status,
            'billing_reason': self.billing_reason,
            'created_at': self.created_at.isoformat(),
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'voided_at': self.voided_at.isoformat() if self.voided_at else None,
            'description': self.description,
            'invoice_pdf_url': self.invoice_pdf_url,
            'hosted_invoice_url': self.hosted_invoice_url,
            'invoice_metadata': self.get_metadata(),
            'balance_due': self.get_balance_due(),
            'is_paid': self.is_paid(),
            'is_overdue': self.is_overdue()
        }


class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    stripe_invoice_item_id = db.Column(db.String(100))
    
    # Item details
    description = db.Column(db.String(500), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_amount = db.Column(db.Numeric(10, 2), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    
    # Period for subscription items
    period_start = db.Column(db.DateTime)
    period_end = db.Column(db.DateTime)
    
    # Proration and discounts
    proration = db.Column(db.Boolean, default=False)
    discount_amount = db.Column(db.Numeric(10, 2), default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    invoice = db.relationship('Invoice', back_populates='invoice_items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'stripe_invoice_item_id': self.stripe_invoice_item_id,
            'description': self.description,
            'quantity': self.quantity,
            'unit_amount': float(self.unit_amount),
            'amount': float(self.amount),
            'currency': self.currency,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'proration': self.proration,
            'discount_amount': float(self.discount_amount or 0),
            'created_at': self.created_at.isoformat()
        }


# Helper functions for invoice management

def generate_invoice_number():
    """Generate a unique invoice number"""
    from datetime import datetime
    import random
    import string
    
    # Format: INV-YYYYMM-XXXXX (e.g., INV-202505-A1B2C)
    year_month = datetime.now().strftime('%Y%m')
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    
    invoice_number = f"INV-{year_month}-{random_suffix}"
    
    # Ensure uniqueness
    while Invoice.query.filter_by(invoice_number=invoice_number).first():
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        invoice_number = f"INV-{year_month}-{random_suffix}"
    
    return invoice_number


def create_invoice_from_stripe(stripe_invoice):
    """Create invoice from Stripe invoice object"""
    
    # Find subscription
    from app.models.billing import Subscription
    subscription = Subscription.query.filter_by(
        stripe_subscription_id=stripe_invoice.subscription
    ).first()
    
    if not subscription:
        raise ValueError(f"Subscription not found for Stripe ID: {stripe_invoice.subscription}")
    
    # Create invoice
    invoice = Invoice(
        subscription_id=subscription.id,
        stripe_invoice_id=stripe_invoice.id,
        invoice_number=generate_invoice_number(),
        amount_due=stripe_invoice.amount_due / 100,  # Convert from cents
        amount_paid=stripe_invoice.amount_paid / 100,
        currency=stripe_invoice.currency.upper(),
        tax_amount=(stripe_invoice.tax or 0) / 100,
        status=stripe_invoice.status,
        billing_reason=stripe_invoice.billing_reason,
        period_start=datetime.fromtimestamp(stripe_invoice.period_start) if stripe_invoice.period_start else None,
        period_end=datetime.fromtimestamp(stripe_invoice.period_end) if stripe_invoice.period_end else None,
        due_date=datetime.fromtimestamp(stripe_invoice.due_date) if stripe_invoice.due_date else None,
        paid_at=datetime.fromtimestamp(stripe_invoice.status_transitions.paid_at) if stripe_invoice.status_transitions.paid_at else None,
        description=stripe_invoice.description,
        invoice_pdf_url=stripe_invoice.invoice_pdf,
        hosted_invoice_url=stripe_invoice.hosted_invoice_url
    )
    
    db.session.add(invoice)
    db.session.flush()  # Get the invoice ID
    
    # Create invoice items
    for stripe_item in stripe_invoice.lines.data:
        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            stripe_invoice_item_id=stripe_item.id,
            description=stripe_item.description or 'Subscription charge',
            quantity=stripe_item.quantity,
            unit_amount=stripe_item.price.unit_amount / 100,
            amount=stripe_item.amount / 100,
            currency=stripe_item.currency.upper(),
            period_start=datetime.fromtimestamp(stripe_item.period.start) if stripe_item.period else None,
            period_end=datetime.fromtimestamp(stripe_item.period.end) if stripe_item.period else None,
            proration=stripe_item.proration
        )
        db.session.add(invoice_item)
    
    db.session.commit()
    return invoice


def get_overdue_invoices(user_id=None):
    """Get all overdue invoices, optionally filtered by user"""
    query = db.session.query(Invoice).filter(
        Invoice.status.in_(['open', 'past_due']),
        Invoice.due_date < datetime.utcnow()
    )
    
    if user_id:
        query = query.join(Subscription).filter(Subscription.user_id == user_id)
    
    return query.all()


def get_user_invoices(user_id, limit=None, status=None):
    """Get invoices for a specific user"""
    query = db.session.query(Invoice).join(Subscription).filter(
        Subscription.user_id == user_id
    )
    
    if status:
        query = query.filter(Invoice.status == status)
    
    query = query.order_by(Invoice.created_at.desc())
    
    if limit:
        query = query.limit(limit)
    
    return query.all()