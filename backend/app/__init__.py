"""GigShift Flask app factory."""

from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.db import init_db


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
    )

    init_db(app.config["DB_PATH"])

    from app.routes import api as api_routes

    app.register_blueprint(api_routes.bp)

    return app
