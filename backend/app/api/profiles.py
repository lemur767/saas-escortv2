from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.profile import Profile
from backend.app.models.auto_replies import AutoReply
from app.models.text_example import TextExample
from app.extensions import db
import json

profiles_bp = Blueprint('profiles', __name__)

@profiles_bp.route('', methods=['GET'])
@jwt_required()
def get_profiles():
    user_id = get_jwt_identity()
    
    # Fetch profiles
    profiles = Profile.query.filter_by(user_id=user_id).all()
    
    return jsonify([profile.to_dict() for profile in profiles]), 200

@profiles_bp.route('/<int:profile_id>', methods=['GET'])
@jwt_required()
def get_profile(profile_id):
    user_id = get_jwt_identity()
    
    # Find profile
    profile = Profile.query.get_or_404(profile_id)
    
    # Check ownership
    if profile.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    return jsonify(profile.to_dict()), 200

@profiles_bp.route('', methods=['POST'])
@jwt_required()
def create_profile():
    user_id = get_jwt_identity()
    data = request.json
    
    # Validate required fields
    if not all([data.get('name'), data.get('phone_number')]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Check if phone number is already in use
    if Profile.query.filter_by(phone_number=data['phone_number']).first():
        return jsonify({"error": "Phone number already in use"}), 400
    
    # Create default business hours
    default_hours = {
        "monday": {"start": "10:00", "end": "22:00"},
        "tuesday": {"start": "10:00", "end": "22:00"},
        "wednesday": {"start": "10:00", "end": "22:00"},
        "thursday": {"start": "10:00", "end": "22:00"},
        "friday": {"start": "10:00", "end": "22:00"},
        "saturday": {"start": "12:00", "end": "22:00"},
        "sunday": {"start": "12:00", "end": "22:00"},
    }
    
    # Create new profile
    profile = Profile(
        user_id=user_id,
        name=data['name'],
        phone_number=data['phone_number'],
        description=data.get('description', ''),
        business_hours=json.dumps(default_hours)
    )
    
    db.session.add(profile)
    db.session.commit()
    
    return jsonify(profile.to_dict()), 201

@profiles_bp.route('/<int:profile_id>/toggle_ai', methods=['POST'])
@jwt_required()
def toggle_ai(profile_id):
    user_id = get_jwt_identity()
    data = request.json
    
    # Find profile
    profile = Profile.query.get_or_404(profile_id)
    
    # Check ownership
    if profile.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Update AI setting
    profile.ai_enabled = data.get('enabled', not profile.ai_enabled)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "ai_enabled": profile.ai_enabled
    }), 200

# Auto-reply endpoints
@profiles_bp.route('/<int:profile_id>/auto_replies', methods=['GET'])
@jwt_required()
def get_auto_replies(profile_id):
    user_id = get_jwt_identity()
    
    # Find profile
    profile = Profile.query.get_or_404(profile_id)
    
    # Check ownership
    if profile.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Get auto replies
    auto_replies = AutoReply.query.filter_by(profile_id=profile_id).all()
    
    return jsonify([ar.to_dict() for ar in auto_replies]), 200

# Text examples endpoints
@profiles_bp.route('/<int:profile_id>/text_examples', methods=['GET'])
@jwt_required()
def get_text_examples(profile_id):
    user_id = get_jwt_identity()
    
    # Find profile
    profile = Profile.query.get_or_404(profile_id)
    
    # Check ownership
    if profile.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Get text examples
    examples = TextExample.query.filter_by(profile_id=profile_id).all()
    
    return jsonify([ex.to_dict() for ex in examples]), 200
