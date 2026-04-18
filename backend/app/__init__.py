from flask import Flask
from dotenv import load_dotenv
import os

load_dotenv()


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['ZAI_API_KEY'] = os.getenv('ZAI_API_KEY')
    app.config['ZAI_API_URL'] = os.getenv('ZAI_API_URL', 'https://api.zai.com/v1/glm')

    from app.routes import api
    app.register_blueprint(api.bp)

    return app