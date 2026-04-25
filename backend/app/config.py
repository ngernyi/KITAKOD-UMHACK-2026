import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    ZAI_API_KEY = os.getenv('ZAI_API_KEY')
    ZAI_API_URL = os.getenv('ZAI_API_URL', 'https://api.zai.com/v1/glm')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', '1') == '1'