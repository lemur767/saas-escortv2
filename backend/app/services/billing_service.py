"""
Billing Service for handling subscriptions, payments, and Stripe integration.
"""

import stripe
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from flask import current_app
import json

from app.extensions import db
from app.models import (
    User, Subscription, SubscriptionPlan, PaymentMethod, 
    Invoice, UsageRecord
)


class BillingService:
    """Service for handling billing operations."""
    
    def __init__(self):
        """Initialize Stripe API key."""
        stripe.api_key = current_app.config.get('STRIPE_SECRET_KEY')
    
    @staticmethod
    def create_subscription(user_id: int, plan_id: int, 
                          payment_method_id: str = None) -> Tuple[bool, Dict]:
        """Create a new subscription for a user."""
        user = User.query.get(user_id)
        plan = SubscriptionPlan.query.get(plan_id)
        
        if not user or not plan:
            return False, {'error': 'User or plan not found'}
        
        # Check if user already has an active subscription
        existing_sub = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()
        
        if existing_sub:
            return False, {'error': 'User already has an active subscription'}
        
        try:
            # Create or get Stripe customer
            stripe_customer = BillingService._get_or_create_stripe_customer(user)
            
            # Create Stripe subscription
            stripe_sub_data = {
                'customer': stripe_customer.id,
                'items': [{'price': plan.stripe_price_id}],
                'expand': ['latest_invoice.payment_intent']
            }
            
            if payment_method_id:
                stripe_sub_data['default_payment_method'] = payment_method_id
            
            stripe_subscription = stripe.Subscription.create(**stripe_sub_data)
            
            # Create database subscription record
            subscription = Subscription(
                user_id=user_id,
                plan_id=plan_id,
                stripe_subscription_id=stripe_subscription.id,
                status=stripe_subscription.status,
                current_period_start=datetime.fromtimestamp(
                    stripe_subscription.current_period_start
                ),
                current_period_end=datetime.fromtimestamp(
                    stripe_subscription.current_period_end
                )
            )
            
            db.session.add(subscription)
            db.session.commit()
            
            return True, {
                'subscription': subscription.to_dict(),
                'stripe_subscription': stripe_subscription
            }
            
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe error creating subscription: {e}")
            return False, {'error': str(e)}
        except Exception as e:
            current_app.logger.error(f"Error creating subscription: {e}")
            return False, {'error': 'Subscription creation failed'}
    
    @staticmethod
    def update_subscription(subscription_id: int, 
                          new_plan_id: int = None) -> Tuple[bool, Dict]:
        """Update an existing subscription."""
        subscription = Subscription.query.get(subscription_id)
        if not subscription:
            return False, {'error': 'Subscription not found'}
        
        try:
            stripe_subscription = stripe.Subscription.retrieve(
                subscription.stripe_subscription_id
            )
            
            if new_plan_id:
                new_plan = SubscriptionPlan.query.get(new_plan_id)
                if not new_plan:
                    return False, {'error': 'New plan not found'}
                
                # Update the subscription in Stripe
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    items=[{
                        'id': stripe_subscription['items']['data'][0].id,
                        'price': new_plan.stripe_price_id,
                    }],
                    proration_behavior='immediate_with_invoice'
                )
                
                # Update database record
                subscription.plan_id = new_plan_id
            
            # Update status and periods from Stripe
            updated_stripe_sub = stripe.Subscription.retrieve(
                subscription.stripe_subscription_id
            )
            
            subscription.status = updated_stripe_sub.status
            subscription.current_period_start = datetime.fromtimestamp(
                updated_stripe_sub.current_period_start
            )
            subscription.current_period_end = datetime.fromtimestamp(
                updated_stripe_sub.current_period_end
            )
            
            db.session.commit()
            
            return True, {'subscription': subscription.to_dict()}
            
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe error updating subscription: {e}")
            return False, {'error': str(e)}
        except Exception as e:
            current_app.logger.error(f"Error updating subscription: {e}")
            return False, {'error': 'Subscription update failed'}
    
    @staticmethod
    def cancel_subscription(subscription_id: int, 
                          immediate: bool = False) -> Tuple[bool, Dict]:
        """Cancel a subscription."""
        subscription = Subscription.query.get(subscription_id)
        if not subscription:
            return False, {'error': 'Subscription not found'}
        
        try:
            if immediate:
                # Cancel immediately
                stripe.Subscription.delete(subscription.stripe_subscription_id)
                subscription.status = 'canceled'
            else:
                # Cancel at period end
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
                subscription.cancel_at_period_end = True
            
            db.session.commit()
            
            return True, {'subscription': subscription.to_dict()}
            
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe error canceling subscription: {e}")
            return False, {'error': str(e)}
        except Exception as e:
            current_app.logger.error(f"Error canceling subscription: {e}")
            return False, {'error': 'Subscription cancellation failed'}
    
    @staticmethod
    def _get_or_create_stripe_customer(user: User) -> stripe.Customer:
        """Get or create a Stripe customer for a user."""
        # Check if user already has a Stripe customer ID
        if hasattr(user, 'stripe_customer_id') and user.stripe_customer_id:
            try:
                return stripe.Customer.retrieve(user.stripe_customer_id)
            except stripe.error.InvalidRequestError:
                # Customer doesn't exist in Stripe, create new one
                pass
        
        # Create new Stripe customer
        customer = stripe.Customer.create(
            email=user.email,
            name=f"{user.first_name} {user.last_name}".strip(),
            phone=user.phone_number,
            metadata={'user_id': str(user.id)}
        )
        
        # Store Stripe customer ID if we have a field for it
        if hasattr(user, 'stripe_customer_id'):
            user.stripe_customer_id = customer.id
            db.session.commit()
        
        return customer
    
    @staticmethod
    def add_payment_method(user_id: int, payment_method_id: str, 
                          set_as_default: bool = False) -> Tuple[bool, Dict]:
        """Add a payment method for a user."""
        user = User.query.get(user_id)
        if not user:
            return False, {'error': 'User not found'}
        
        try:
            stripe_customer = BillingService._get_or_create_stripe_customer(user)
            
            # Attach payment method to customer
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=stripe_customer.id
            )
            
            # Retrieve payment method details
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
            
            # Get user's subscription
            subscription = Subscription.query.filter_by(
                user_id=user_id,
                status='active'
            ).first()
            
            # Create database record
            pm_record = PaymentMethod(
                user_id=user_id,
                subscription_id=subscription.id if subscription else None,
                stripe_payment_method_id=payment_method_id,
                card_last4=payment_method.card.last4,
                card_brand=payment_method.card.brand,
                card_exp_month=payment_method.card.exp_month,
                card_exp_year=payment_method.card.exp_year,
                is_default=set_as_default
            )
            
            db.session.add(pm_record)
            
            # Set as default if requested
            if set_as_default:
                # Remove default from other payment methods
                PaymentMethod.query.filter_by(user_id=user_id).update(
                    {'is_default': False}
                )
                
                # Update customer's default payment method
                stripe.Customer.modify(
                    stripe_customer.id,
                    invoice_settings={
                        'default_payment_method': payment_method_id
                    }
                )
            
            db.session.commit()
            
            return True, {'payment_method': pm_record.to_dict()}
            
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe error adding payment method: {e}")
            return False, {'error': str(e)}
        except Exception as e:
            current_app.logger.error(f"Error adding payment method: {e}")
            return False, {'error': 'Adding payment method failed'}
    
    @staticmethod
    def remove_payment_method(payment_method_id: int) -> Tuple[bool, Dict]:
        """Remove a payment method."""
        pm_record = PaymentMethod.query.get(payment_method_id)
        if not pm_record:
            return False, {'error': 'Payment method not found'}
        
        try:
            # Detach from Stripe
            stripe.PaymentMethod.detach(pm_record.stripe_payment_method_id)
            
            # Remove from database
            db.session.delete(pm_record)
            db.session.commit()
            
            return True, {'message': 'Payment method removed successfully'}
            
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe error removing payment method: {e}")
            return False, {'error': str(e)}
        except Exception as e:
            current_app.logger.error(f"Error removing payment method: {e}")
            return False, {'error': 'Removing payment method failed'}
    
    @staticmethod
    def process_webhook(event_data: Dict) -> Tuple[bool, str]:
        """Process Stripe webhook events."""
        event_type = event_data.get('type')
        data = event_data.get('data', {}).get('object', {})
        
        try:
            if event_type == 'customer.subscription.updated':
                return BillingService._handle_subscription_updated(data)
            elif event_type == 'customer.subscription.deleted':
                return BillingService._handle_subscription_canceled(data)
            elif event_type == 'invoice.payment_succeeded':
                return BillingService._handle_payment_succeeded(data)
            elif event_type == 'invoice.payment_failed':
                return BillingService._handle_payment_failed(data)
            else:
                return True, f"Unhandled event type: {event_type}"
                
        except Exception as e:
            current_app.logger.error(f"Error processing webhook: {e}")
            return False, str(e)
    
    @staticmethod
    def _handle_subscription_updated(stripe_sub: Dict) -> Tuple[bool, str]:
        """Handle subscription updated webhook."""
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=stripe_sub['id']
        ).first()
        
        if not subscription:
            return False, "Subscription not found in database"
        
        # Update subscription details
        subscription.status = stripe_sub['status']
        subscription.current_period_start = datetime.fromtimestamp(
            stripe_sub['current_period_start']
        )
        subscription.current_period_end = datetime.fromtimestamp(
            stripe_sub['current_period_end']
        )
        subscription.cancel_at_period_end = stripe_sub.get('cancel_at_period_end', False)
        
        db.session.commit()
        
        return True, "Subscription updated successfully"
    
    @staticmethod
    def _handle_subscription_canceled(stripe_sub: Dict) -> Tuple[bool, str]:
        """Handle subscription canceled webhook."""
        subscription = Subscription.query.filter_by