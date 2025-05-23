from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_current_user
)
from app.models.user import User
from app.service.twilio_service import TwilioService
from app.models.twilio_usage import TwilioUsage
from app.extensions import db
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    
    # Validate required fields
    if not all([data.get('username'), data.get('email'), data.get('password')]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Check if username or email already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "Username already taken"}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already registered"}), 400
    
    user = User(
        username=data['username'],
        email=data['email'],
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        phone_number=data.get('phone_number')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Only create Twilio subaccount if configured to do so by default
    twilio_account_created = False
    if current_app.config.get('TWILIO_DEFAULT_TO_SUBACCOUNT', True):
        # Create Twilio subaccount for the user
        twilio_service = TwilioService()
        success, error = twilio_service.create_subaccount(user)
        
        if success:
            # Save the Twilio credentials
            db.session.commit()
            twilio_account_created = True
        else:
            # Log the error but continue with registration
            current_app.logger.error(f"Failed to create Twilio account for user {user.id}: {error}")
    
    # Generate tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
        "twilio_account_created": twilio_account_created
    }), 201
    
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    
    # Validate required fields
    if not all([data.get('username'), data.get('password')]):
        return jsonify({"error": "Missing username or password"}), 400
    
    # Find user
    user = User.query.filter_by(username=data['username']).first()
    
    # Verify credentials
    if not user or not user.check_password(data['password']):
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Generate tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/refresh-token', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        "access_token": access_token
    }), 200
