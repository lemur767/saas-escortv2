"""
Analytics Service for tracking usage, performance, and business metrics.
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple
from sqlalchemy import func, and_, or_
from flask import current_app
import json

from app.extensions import db
from app.models import (
    User, Profile, Message, Subscription, UsageRecord,
    Client, ProfileClient, FlaggedMessage, AIModelSettings
)


class AnalyticsService:
    """Service for handling analytics and reporting."""
    
    @staticmethod
    def get_user_overview(user_id: int) -> Dict:
        """Get overview statistics for a user."""
        user = User.query.get(user_id)
        if not user:
            return {}
        
        # Get user's profiles
        profiles = Profile.query.filter_by(user_id=user_id).all()
        profile_ids = [p.id for p in profiles]
        
        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()
        
        # Calculate date ranges
        today = date.today()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Get message statistics
        total_messages = Message.query.filter(
            Message.profile_id.in_(profile_ids)
        ).count() if profile_ids else 0
        
        messages_this_week = Message.query.filter(
            Message.profile_id.in_(profile_ids),
            Message.timestamp >= week_ago
        ).count() if profile_ids else 0
        
        messages_this_month = Message.query.filter(
            Message.profile_id.in_(profile_ids),
            Message.timestamp >= month_ago
        ).count() if profile_ids else 0
        
        # AI responses
        ai_responses_total = Message.query.filter(
            Message.profile_id.in_(profile_ids),
            Message.ai_generated == True,
            Message.is_incoming == False
        ).count() if profile_ids else 0
        
        ai_responses_this_month = Message.query.filter(
            Message.profile_id.in_(profile_ids),
            Message.ai_generated == True,
            Message.is_incoming == False,
            Message.timestamp >= month_ago
        ).count() if profile_ids else 0
        
        # Get unique clients
        unique_clients = db.session.query(Message.sender_number).filter(
            Message.profile_id.in_(profile_ids)
        ).distinct().count() if profile_ids else 0
        
        # Flagged messages
        flagged_count = db.session.query(FlaggedMessage).join(Message).filter(
            Message.profile_id.in_(profile_ids),
            FlaggedMessage.is_reviewed == False
        ).count() if profile_ids else 0
        
        return {
            'user_id': user_id,
            'profiles_count': len(profiles),
            'subscription': subscription.to_dict() if subscription else None,
            'messages': {
                'total': total_messages,
                'this_week': messages_this_week,
                'this_month': messages_this_month
            },
            'ai_responses': {
                'total': ai_responses_total,
                'this_month': ai_responses_this_month
            },
            'unique_clients': unique_clients,
            'flagged_messages': flagged_count,
            'created_at': user.created_at.isoformat()
        }
    
    @staticmethod
    def get_profile_analytics(profile_id: int, days: int = 30) -> Dict:
        """Get detailed analytics for a specific profile."""
        profile = Profile.query.get(profile_id)
        if not profile:
            return {}
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get message statistics
        total_messages = Message.query.filter_by(profile_id=profile_id).count()
        
        incoming_messages = Message.query.filter(
            Message.profile_id == profile_id,
            Message.is_incoming == True,
            Message.timestamp >= start_date
        ).count()
        
        outgoing_messages = Message.query.filter(
            Message.profile_id == profile_id,
            Message.is_incoming == False,
            Message.timestamp >= start_date
        ).count()
        
        ai_responses = Message.query.filter(
            Message.profile_id == profile_id,
            Message.ai_generated == True,
            Message.timestamp >= start_date
        ).count()
        
        # Response time analysis
        response_times = AnalyticsService._calculate_response_times(profile_id, days)
        
        # Client engagement
        client_stats = AnalyticsService._get_client_engagement(profile_id, days)
        
        # Message volume by hour/day
        message_trends = AnalyticsService._get_message_trends(profile_id, days)
        
        # Flagged messages
        flagged_messages = db.session.query(FlaggedMessage).join(Message).filter(
            Message.profile_id == profile_id,
            Message.timestamp >= start_date
        ).count()
        
        # AI usage efficiency
        ai_effectiveness = AnalyticsService._calculate_ai_effectiveness(profile_id, days)
        
        return {
            'profile_id': profile_id,
            'profile_name': profile.name,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'message_stats': {
                'total_all_time': total_messages,
                'incoming': incoming_messages,
                'outgoing': outgoing_messages,
                'ai_generated': ai_responses,
                'ai_percentage': (ai_responses / max(outgoing_messages, 1)) * 100
            },
            'response_times': response_times,
            'client_engagement': client_stats,
            'message_trends': message_trends,
            'flagged_messages': flagged_messages,
            'ai_effectiveness': ai_effectiveness
        }
    
    @staticmethod
    def _calculate_response_times(profile_id: int, days: int) -> Dict:
        """Calculate average response times."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get conversation pairs (incoming -> outgoing)
        conversations = db.session.query(
            Message.sender_number,
            Message.timestamp,
            Message.is_incoming
        ).filter(
            Message.profile_id == profile_id,
            Message.timestamp >= start_date
        ).order_by(Message.sender_number, Message.timestamp).all()
        
        response_times = []
        current_client = None
        last_incoming = None
        
        for msg in conversations:
            client, timestamp, is_incoming = msg
            
            if client != current_client:
                current_client = client
                last_incoming = None
            
            if is_incoming:
                last_incoming = timestamp
            elif last_incoming and not is_incoming:
                # Calculate response time
                response_time = (timestamp - last_incoming).total_seconds()
                response_times.append(response_time)
                last_incoming = None
        
        if not response_times:
            return {
                'average_seconds': 0,
                'average_minutes': 0,
                'median_seconds': 0,
                'fastest_seconds': 0,
                'slowest_seconds': 0
            }
        
        avg_time = sum(response_times) / len(response_times)
        sorted_times = sorted(response_times)
        median_time = sorted_times[len(sorted_times) // 2]
        
        return {
            'average_seconds': avg_time,
            'average_minutes': avg_time / 60,
            'median_seconds': median_time,
            'fastest_seconds': min(response_times),
            'slowest_seconds': max(response_times),
            'total_responses': len(response_times)
        }
    
    @staticmethod
    def _get_client_engagement(profile_id: int, days: int) -> Dict:
        """Get client engagement statistics."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get message counts per client
        client_messages = db.session.query(
            Message.sender_number,
            func.count(Message.id).label('message_count'),
            func.max(Message.timestamp).label('last_message')
        ).filter(
            Message.profile_id == profile_id,
            Message.timestamp >= start_date
        ).group_by(Message.sender_number).all()
        
        if not client_messages:
            return {
                'total_clients': 0,
                'active_clients': 0,
                'top_clients': [],
                'average_messages_per_client': 0
            }
        
        # Sort by message count
        top_clients = sorted(client_messages, key=lambda x: x.message_count, reverse=True)[:10]
        
        # Calculate averages
        total_messages = sum(cm.message_count for cm in client_messages)
        average_per_client = total_messages / len(client_messages)
        
        # Active clients (messaged in last 7 days)
        week_ago = end_date - timedelta(days=7)
        active_clients = sum(1 for cm in client_messages if cm.last_message >= week_ago)
        
        return {
            'total_clients': len(client_messages),
            'active_clients': active_clients,
            'top_clients': [
                {
                    'phone_number': cm.sender_number,
                    'message_count': cm.message_count,
                    'last_message': cm.last_message.isoformat()
                }
                for cm in top_clients
            ],
            'average_messages_per_client': average_per_client
        }
    
    @staticmethod
    def _get_message_trends(profile_id: int, days: int) -> Dict:
        """Get message volume trends by time periods."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Messages by hour of day
        hourly_stats = db.session.query(
            func.extract('hour', Message.timestamp).label('hour'),
            func.count(Message.id).label('count')
        ).filter(
            Message.profile_id == profile_id,
            Message.timestamp >= start_date
        ).group_by(func.extract('hour', Message.timestamp)).all()
        
        # Messages by day of week
        daily_stats = db.session.query(
            func.extract('dow', Message.timestamp).label('day_of_week'),
            func.count(Message.id).label('count')
        ).filter(
            Message.profile_id == profile_id,
            Message.timestamp >= start_date
        ).group_by(func.extract('dow', Message.timestamp)).all()
        
        # Daily message volume
        daily_volume = db.session.query(
            func.date(Message.timestamp).label('date'),
            func.count(Message.id).label('count')
        ).filter(
            Message.profile_id == profile_id,
            Message.timestamp >= start_date
        ).group_by(func.date(Message.timestamp)).all()
        
        return {
            'hourly': {f"{int(stat.hour):02d}:00": stat.count for stat in hourly_stats},
            'daily': {
                str(int(stat.day_of_week)): stat.count 
                for stat in daily_stats
            },
            'volume_by_date': {
                stat.date.isoformat(): stat.count 
                for stat in daily_volume
            }
        }
    
    @staticmethod
    def _calculate_ai_effectiveness(profile_id: int, days: int) -> Dict:
        """Calculate AI effectiveness metrics."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get AI responses
        ai_responses = Message.query.filter(
            Message.profile_id == profile_id,
            Message.ai_generated == True,
            Message.timestamp >= start_date
        ).count()
        
        total_responses = Message.query.filter(
            Message.profile_id == profile_id,
            Message.is_incoming == False,
            Message.timestamp >= start_date
        ).count()
        
        # Get conversation continuation rate after AI responses
        ai_conversations = db.session.query(
            Message.sender_number,
            Message.timestamp
        ).filter(
            Message.profile_id == profile_id,
            Message.ai_generated == True,
            Message.timestamp >= start_date
        ).all()
        
        continued_conversations = 0
        for ai_msg in ai_conversations:
            # Check if client replied within 1 hour
            next_message = Message.query.filter(
                Message.profile_id == profile_id,
                Message.sender_number == ai_msg.sender_number,
                Message.is_incoming == True,
                Message.timestamp > ai_msg.timestamp,
                Message.timestamp <= ai_msg.timestamp + timedelta(hours=1)
            ).first()
            
            if next_message:
                continued_conversations += 1
        
        continuation_rate = (continued_conversations / max(ai_responses, 1)) * 100
        ai_usage_rate = (ai_responses / max(total_responses, 1)) * 100
        
        return {
            'ai_responses': ai_responses,
            'total_responses': total_responses,
            'ai_usage_percentage': ai_usage_rate,
            'conversation_continuation_rate': continuation_rate,
            'conversations_continued': continued_conversations
        }
    
    @staticmethod
    def get_system_analytics() -> Dict:
        """Get system-wide analytics (admin only)."""
        # Total users and profiles
        total_users = User.query.count()
        total_profiles = Profile.query.count()
        active_profiles = Profile.query.filter_by(is_active=True).count()
        
        # Subscription statistics
        subscription_stats = db.session.query(
            SubscriptionPlan.name,
            func.count(Subscription.id).label('count')
        ).join(Subscription, SubscriptionPlan.id == Subscription.plan_id).filter(
            Subscription.status == 'active'
        ).group_by(SubscriptionPlan.name).all()
        
        # Message statistics
        total_messages = Message.query.count()
        ai_messages = Message.query.filter_by(ai_generated=True).count()
        flagged_messages = FlaggedMessage.query.filter_by(is_reviewed=False).count()
        
        # Growth metrics (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()
        new_profiles_30d = Profile.query.filter(Profile.created_at >= thirty_days_ago).count()
        
        return {
            'users': {
                'total': total_users,
                'new_last_30_days': new_users_30d
            },
            'profiles': {
                'total': total_profiles,
                'active': active_profiles,
                'new_last_30_days': new_profiles_30d
            },
            'subscriptions': {
                stat.name: stat.count for stat in subscription_stats
            },
            'messages': {
                'total': total_messages,
                'ai_generated': ai_messages,
                'ai_percentage': (ai_messages / max(total_messages, 1)) * 100,
                'flagged_unreviewed': flagged_messages
            }
        }
    
    @staticmethod
    def track_usage(user_id: int, profile_id: Optional[int] = None, 
                   action: str = 'message', **kwargs) -> UsageRecord:
        """Track user activity for billing and analytics."""
        today = date.today()
        
        # Get or create usage record for today
        usage_record = UsageRecord.query.filter_by(
            user_id=user_id,
            profile_id=profile_id,
            date=today
        ).first()
        
        if not usage_record:
            # Get subscription for the user
            subscription = Subscription.query.filter_by(
                user_id=user_id,
                status='active'
            ).first()
            
            usage_record = UsageRecord(
                user_id=user_id,
                profile_id=profile_id,
                subscription_id=subscription.id if subscription else None,
                date=today
            )
            db.session.add(usage_record)
        
        # Update counters based on action
        if action == 'incoming_message':
            usage_record.incoming_messages += 1
        elif action == 'outgoing_message':
            usage_record.outgoing_messages += 1
        elif action == 'ai_response':
            usage_record.ai_responses += 1
        elif action == 'flagged_message':
            usage_record.flagged_messages += 1
        
        db.session.commit()
        return usage_record
    
    @staticmethod
    def export_analytics(user_id: int, start_date: date, end_date: date) -> Dict:
        """Export analytics data for a date range."""
        profiles = Profile.query.filter_by(user_id=user_id).all()
        profile_ids = [p.id for p in profiles]
        
        if not profile_ids:
            return {'error': 'No profiles found'}
        
        # Usage records
        usage_records = UsageRecord.query.filter(
            UsageRecord.user_id == user_id,
            UsageRecord.date >= start_date,
            UsageRecord.date <= end_date
        ).all()
        
        # Message data
        messages = Message.query.filter(
            Message.profile_id.in_(profile_ids),
            func.date(Message.timestamp) >= start_date,
            func.date(Message.timestamp) <= end_date
        ).all()
        
        return {
            'user_id': user_id,
            'export_date': datetime.utcnow().isoformat(),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'usage_records': [record.to_dict() for record in usage_records],
            'messages': [msg.to_dict() for msg in messages],
            'summary': {
                'total_messages': len(messages),
                'profiles_included': len(profiles),
                'days_included': (end_date - start_date).days + 1
            }
        }