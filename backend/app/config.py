import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    #DB setup
    DB_NAME = os.environ.get('DB_NAME', 'replify')
    DB_USER = os.environ.get('DB_USER', 'app_user')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'plmnko1423$')
    
    # Twilio configuration
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    VERIFY_TWILIO_SIGNATURE = os.environ.get('VERIFY_TWILIO_SIGNATURE', 'True') == 'True'
    
    #Local LLM
    # LLM Configuration
    LLM_ENDPOINT = os.environ.get('LLM_ENDPOINT', 'http://192.46.222.246:11434/api/')
    LLM_MODEL = os.environ.get('LLM_MODEL', 'dolphin3')
    LLM_TIMEOUT = int(os.environ.get('LLM_TIMEOUT', '30'))
    LLM_MAX_TOKENS = int(os.environ.get('LLM_MAX_TOKENS', '150'))
    LLM_TEMPERATURE = float(os.environ.get('LLM_TEMPERATURE', '0.7'))
    
    # Message Processing
    MAX_MESSAGE_LENGTH = int(os.environ.get('MAX_MESSAGE_LENGTH', '1600'))
    AUTO_REPLY_ENABLED = os.environ.get('AUTO_REPLY_ENABLED', 'True').lower() == 'true'
    
    # Webhook Configuration
    WEBHOOK_TIMEOUT = int(os.environ.get('WEBHOOK_TIMEOUT', '5'))  # Seconds to respond to Twilio
      
    # Stripe configuration
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    # Celery configuration
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        f'postgresql://{Config.DB_USER}:{Config.DB_PASS}@localhost:/{Config.DB_NAME}'


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or \
        f'postgresql://{Config.DB_USER}:{Config.DB_PASS}@localhost:5432/{Config.DB_NAME}'


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
       
    VERIFY_TWILIO_SIGNATURE = True
    
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}