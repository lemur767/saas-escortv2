# app/utils/security.py
import re
import secrets
import string
from datetime import datetime, timedelta
from functools import wraps
from collections import defaultdict
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import hashlib
import hmac
import phonenumbers
from email_validator import validate_email, EmailNotValidError


# Rate limiting storage (in production, use Redis instead)
rate_limit_storage = defaultdict(list)


class SecurityConfig:
    """Security configuration constants"""
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    MAX_PASSWORD_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL_CHARS = True
    
    # Rate limiting defaults
    DEFAULT_RATE_LIMIT = 100  # requests per window
    DEFAULT_RATE_WINDOW = 3600  # 1 hour in seconds
    
    # Security patterns
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Blocked user agents (bot detection)
    BLOCKED_USER_AGENTS = [
        'bot', 'crawler', 'spider', 'scraper', 
        'curl', 'wget', 'python-requests'
    ]


def generate_secure_key(length=32):
    """
    Generate a cryptographically secure random key.
    
    This is essential for creating:
    - API keys
    - Session tokens
    - Verification codes
    
    Args:
        length (int): Length of the generated key
        
    Returns:
        str: Secure random string
    """
    # Use secrets module for cryptographically secure random generation
    # This is much better than regular random module for security purposes
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_verification_code(length=6, digits_only=True):
    """
    Generate verification codes for email/SMS verification.
    
    Args:
        length (int): Length of the code
        digits_only (bool): Whether to use only digits
        
    Returns:
        str: Verification code
    """
    if digits_only:
        # Use only digits for SMS/email codes (easier for users to type)
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    else:
        # Use alphanumeric for more complex codes
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))


def validate_password_strength(password):
    """
    Validate password meets security requirements.
    
    This is crucial for protecting user accounts. We check for:
    - Minimum length to prevent brute force attacks
    - Character diversity to increase complexity
    - Common password patterns to avoid
    
    Args:
        password (str): Password to validate
        
    Returns:
        tuple: (is_valid, error_messages)
    """
    errors = []
    
    # Check length requirements
    if len(password) < SecurityConfig.MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {SecurityConfig.MIN_PASSWORD_LENGTH} characters long")
    
    if len(password) > SecurityConfig.MAX_PASSWORD_LENGTH:
        errors.append(f"Password must be no more than {SecurityConfig.MAX_PASSWORD_LENGTH} characters long")
    
    # Check character requirements
    if SecurityConfig.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    if SecurityConfig.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    if SecurityConfig.REQUIRE_NUMBERS and not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    if SecurityConfig.REQUIRE_SPECIAL_CHARS and not re.search(f'[{re.escape(SecurityConfig.SPECIAL_CHARS)}]', password):
        errors.append("Password must contain at least one special character")
    
    # Check for common weak patterns
    if password.lower() in ['password', '12345678', 'qwerty', 'admin']:
        errors.append("Password is too common. Please choose a more secure password")
    
    # Check for sequential characters
    if re.search(r'(.)\1{2,}', password):  # Three or more repeated characters
        errors.append("Password should not contain repeated characters")
    
    return len(errors) == 0, errors


def sanitize_input(input_string, max_length=1000, allow_html=False):
    """
    Sanitize user input to prevent injection attacks.
    
    This protects against:
    - XSS (Cross-Site Scripting) attacks
    - SQL injection attempts
    - Buffer overflow attempts
    
    Args:
        input_string (str): Input to sanitize
        max_length (int): Maximum allowed length
        allow_html (bool): Whether to allow HTML tags
        
    Returns:
        str: Sanitized input
    """
    if not input_string:
        return ""
    
    # Limit input length to prevent buffer overflow
    if len(input_string) > max_length:
        input_string = input_string[:max_length]
    
    # Remove or escape dangerous characters
    if not allow_html:
        # Remove HTML tags to prevent XSS
        input_string = re.sub(r'<[^>]*>', '', input_string)
        
        # Escape dangerous characters
        dangerous_chars = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;',
            '/': '&#x2F;'
        }
        
        for char, escape in dangerous_chars.items():
            input_string = input_string.replace(char, escape)
    
    # Remove potentially dangerous SQL keywords (basic protection)
    sql_keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER']
    for keyword in sql_keywords:
        # Remove these keywords when they appear at word boundaries
        pattern = r'\b' + re.escape(keyword) + r'\b'
        input_string = re.sub(pattern, '', input_string, flags=re.IGNORECASE)
    
    return input_string.strip()


def validate_email_address(email):
    """
    Validate email address format and deliverability.
    
    Args:
        email (str): Email address to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        # Use email-validator library for comprehensive validation
        valid = validate_email(email)
        # The library normalizes the email address
        return True, valid.email
    except EmailNotValidError as e:
        return False, str(e)


def validate_phone_number(phone, country_code='US'):
    """
    Validate and format phone number.
    
    Args:
        phone (str): Phone number to validate
        country_code (str): Default country code
        
    Returns:
        tuple: (is_valid, formatted_number, error_message)
    """
    try:
        # Parse the phone number
        parsed = phonenumbers.parse(phone, country_code)
        
        # Check if the number is valid
        if not phonenumbers.is_valid_number(parsed):
            return False, None, "Invalid phone number"
        
        # Format in international format
        formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        return True, formatted, None
        
    except phonenumbers.NumberParseException as e:
        return False, None, f"Invalid phone number: {e}"


def rate_limit(max_requests=100, window=3600, key_func=None):
    """
    Decorator for rate limiting API endpoints.
    
    This prevents abuse by limiting how many requests a user can make.
    In production, this should use Redis for distributed rate limiting.
    
    Args:
        max_requests (int): Maximum requests allowed
        window (int): Time window in seconds
        key_func (callable): Function to generate rate limit key
        
    Returns:
        decorator: Rate limiting decorator
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate rate limit key
            if key_func:
                key = key_func()
            else:
                # Default: use IP address and user agent
                key = f"{request.remote_addr}:{request.headers.get('User-Agent', '')}"
            
            # Get current time
            now = datetime.utcnow()
            
            # Clean old entries
            cutoff = now - timedelta(seconds=window)
            rate_limit_storage[key] = [
                timestamp for timestamp in rate_limit_storage[key] 
                if timestamp > cutoff
            ]
            
            # Check if rate limit exceeded
            if len(rate_limit_storage[key]) >= max_requests:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': window
                }), 429
            
            # Add current request
            rate_limit_storage[key].append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def check_suspicious_activity(request_data):
    """
    Check for suspicious activity patterns.
    
    This helps detect:
    - Automated attacks
    - Unusual usage patterns
    - Potential security threats
    
    Args:
        request_data (dict): Request information
        
    Returns:
        tuple: (is_suspicious, reasons)
    """
    reasons = []
    
    # Check user agent
    user_agent = request_data.get('user_agent', '').lower()
    for blocked_agent in SecurityConfig.BLOCKED_USER_AGENTS:
        if blocked_agent in user_agent:
            reasons.append(f"Blocked user agent: {blocked_agent}")
    
    # Check for empty or suspicious user agent
    if not user_agent or len(user_agent) < 10:
        reasons.append("Missing or suspicious user agent")
    
    # Check request frequency (basic check)
    ip = request_data.get('remote_addr')
    if ip:
        recent_requests = rate_limit_storage.get(ip, [])
        if len(recent_requests) > 10:  # More than 10 requests recently
            reasons.append("High request frequency")
    
    # Check for common attack patterns in parameters
    params = str(request_data.get('params', ''))
    attack_patterns = [
        r'<script[^>]*>',  # XSS attempts
        r'(union|select|insert|delete|drop)',  # SQL injection
        r'file://|ftp://|gopher://',  # File inclusion attempts
        r'javascript:',  # JavaScript injection
    ]
    
    for pattern in attack_patterns:
        if re.search(pattern, params, re.IGNORECASE):
            reasons.append(f"Suspicious pattern detected: {pattern}")
    
    return len(reasons) > 0, reasons


def secure_compare(a, b):
    """
    Compare two strings in a cryptographically secure way.
    
    This prevents timing attacks by ensuring comparison
    takes the same amount of time regardless of where
    strings differ.
    
    Args:
        a (str): First string
        b (str): Second string
        
    Returns:
        bool: True if strings are equal
    """
    return hmac.compare_digest(str(a), str(b))


def hash_sensitive_data(data, salt=None):
    """
    Hash sensitive data with optional salt.
    
    Uses SHA-256 with salt for non-password data.
    For passwords, always use werkzeug's password hashing.
    
    Args:
        data (str): Data to hash
        salt (str, optional): Salt to use
        
    Returns:
        tuple: (hash, salt_used)
    """
    if salt is None:
        salt = secrets.token_hex(32)
    
    # Combine data and salt
    salted_data = f"{data}{salt}".encode('utf-8')
    
    # Create hash
    hash_object = hashlib.sha256(salted_data)
    hex_dig = hash_object.hexdigest()
    
    return hex_dig, salt


def verify_recaptcha(recaptcha_response):
    """
    Verify reCAPTCHA response from Google.
    
    Add this to forms to prevent bots.
    
    Args:
        recaptcha_response (str): reCAPTCHA response token
        
    Returns:
        bool: True if verification successful
    """
    import requests
    
    secret_key = current_app.config.get('RECAPTCHA_SECRET_KEY')
    if not secret_key:
        current_app.logger.warning("reCAPTCHA secret key not configured")
        return True  # Don't block if not configured
    
    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': secret_key,
                'response': recaptcha_response,
                'remoteip': request.remote_addr
            },
            timeout=10
        )
        
        result = response.json()
        return result.get('success', False)
        
    except Exception as e:
        current_app.logger.error(f"reCAPTCHA verification error: {e}")
        # In case of error, allow the request (fail open)
        return True


def mask_sensitive_data(data, visible_chars=4):
    """
    Mask sensitive data for logging or display.
    
    Examples:
    - Phone: +1(555)123-4567 → +1(555)***-***7
    - Email: user@example.com → us**@ex***le.com
    - API Key: abc123xyz789 → abc1***x789
    
    Args:
        data (str): Data to mask
        visible_chars (int): Number of chars to keep visible at each end
        
    Returns:
        str: Masked data
    """
    if not data or len(data) <= visible_chars * 2:
        return '*' * len(data) if data else ''
    
    # Calculate mask length
    mask_length = len(data) - (visible_chars * 2)
    
    # Create masked version
    return f"{data[:visible_chars]}{'*' * mask_length}{data[-visible_chars:]}"


# Security middleware functions

def security_headers(response):
    """
    Add security headers to all responses.
    
    This should be registered as an after_request handler.
    
    Args:
        response: Flask response object
        
    Returns:
        response: Modified response with security headers
    """
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'
    
    # Enable XSS protection
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Enforce HTTPS (in production)
    if current_app.config.get('ENV') == 'production':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # Content Security Policy (basic)
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    
    # Hide server information
    response.headers['Server'] = 'Escort SMS API'
    
    return response


def log_security_event(event_type, description, user_id=None, ip_address=None, extra_data=None):
    """
    Log security-related events for monitoring and analysis.
    
    Args:
        event_type (str): Type of security event
        description (str): Event description
        user_id (int, optional): User ID if applicable
        ip_address (str, optional): IP address
        extra_data (dict, optional): Additional event data
    """
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'event_type': event_type,
        'description': description,
        'user_id': user_id,
        'ip_address': ip_address or request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'extra_data': extra_data or {}
    }
    
    # Log to application logger
    current_app.logger.warning(f"Security Event: {log_entry}")
    
    # In production, you might want to send this to a security monitoring service
    # like Splunk, AWS CloudWatch, or a custom security dashboard


# Example usage in your route handlers:
"""
# Rate limiting example
@app.route('/api/auth/login', methods=['POST'])
@rate_limit(max_requests=5, window=900)  # 5 attempts per 15 minutes
def login():
    # Login logic here
    pass

# Password validation example
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    
    is_valid, errors = validate_password_strength(data.get('password'))
    if not is_valid:
        return jsonify({'errors': errors}), 400
    
    # Continue with registration
    pass

# Input sanitization example
@app.route('/api/profiles', methods=['POST'])
def create_profile():
    data = request.json
    
    # Sanitize inputs
    name = sanitize_input(data.get('name'), max_length=100)
    description = sanitize_input(data.get('description'), max_length=1000)
    
    # Continue with profile creation
    pass
"""