from flask import Blueprint, request, jsonify, current_app
from app.services.glm_service import call_glm, call_glm_with_context

bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Server is running'
    })


@bp.route('/glm/predict', methods=['POST'])
def glm_predict():
    """Basic GLM prediction endpoint"""
    data = request.get_json()

    if not data or 'prompt' not in data:
        return jsonify({'error': 'Missing prompt in request'}), 400

    prompt = data['prompt']

    try:
        result = call_glm(prompt)
        return jsonify({
            'success': True,
            'result': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/glm/analyze', methods=['POST'])
def glm_analyze():
    """Advanced GLM analyze with context"""
    data = request.get_json()

    if not data or 'prompt' not in data:
        return jsonify({'error': 'Missing prompt in request'}), 400

    prompt = data['prompt']
    context = data.get('context', [])
    system_prompt = data.get('system_prompt', '')

    try:
        result = call_glm_with_context(prompt, context, system_prompt)
        return jsonify({
            'success': True,
            'result': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/demand/forecast', methods=['POST'])
def demand_forecast():
    """Demand forecast endpoint for celebration demand prediction"""
    data = request.get_json()

    required_fields = ['business_type', 'celebration_type', 'historical_sales']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field} in request'}), 400

    try:
        result = analyze_demand(
            business_type=data['business_type'],
            celebration_type=data['celebration_type'],
            historical_sales=data['historical_sales'],
            additional_context=data.get('additional_context', {})
        )
        return jsonify({
            'success': True,
            'result': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def analyze_demand(business_type, celebration_type, historical_sales, additional_context):
    """Analyze demand using GLM"""

    prompt = f"""Analyze demand prediction for a {business_type} business during {celebration_type} celebration.

Historical Sales Data: {historical_sales}
Additional Context: {additional_context}

Please provide:
1. Demand forecast (predicted sales volume)
2. Confidence score (0-100%)
3. Action items (specific recommendations)
4. Explanation of the prediction

Respond in JSON format."""

    result = call_glm(prompt)
    return result