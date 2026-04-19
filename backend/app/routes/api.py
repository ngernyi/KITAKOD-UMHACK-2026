from flask import Blueprint, request, jsonify
from app.services.glm_service import call_glm, call_glm_with_context

bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Server is running'
    })


# ============== GLM Basic ==============

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


# ============== Data Analysis ==============

@bp.route('/analysis/data', methods=['POST'])
def analyze_data():
    """Data analysis endpoint"""
    data = request.get_json()

    # Mock response for now
    return jsonify({
        'success': True,
        'result': {
            'total_revenue': 2450,
            'total_expenses': 1170,
            'profit': 1280,
            'profit_margin': 52,
            'top_products': [
                {'name': 'Milo 50g', 'qty': 120, 'revenue': 600},
                {'name': 'Maggi', 'qty': 95, 'revenue': 332},
                {'name': 'Biscuit', 'qry': 88, 'revenue': 264}
            ],
            'alerts': [
                {'type': 'warning', 'message': 'Tuesday sales -40% below average'},
                {'type': 'info', 'message': 'Profit margin healthy at 52%'}
            ]
        }
    })


@bp.route('/analysis/full', methods=['POST'])
def full_analysis():
    """Full analysis - all categories"""
    data = request.get_json()

    return jsonify({
        'success': True,
        'result': {
            'data_analysis': _mock_data_analysis(),
            'predictions': _mock_predictions(),
            'actions': _mock_actions(),
            'ai_assumptions': _mock_ai_assumptions()
        }
    })


# ============== Predictions ==============

@bp.route('/forecast', methods=['POST'])
def get_forecast():
    """Get sales forecast"""
    data = request.get_json()
    days = data.get('days', 7)

    # Mock forecast
    forecast = []
    for i in range(days):
        base = 350 + (i * 10)
        forecast.append({
            'day': f'Day {i+1}',
            'date': f'2026-04-{20+i}',
            'predicted': base + 50,
            'range': f'{base}-{base+100}',
            'trend': 'up' if i > 3 else 'stable'
        })

    return jsonify({
        'success': True,
        'result': {
            'forecast': forecast,
            'average': 400,
            'peak': 480,
            'trend': 'upward'
        }
    })


# ============== Actions ==============

@bp.route('/actions', methods=['POST'])
def get_actions():
    """Get AI action recommendations"""
    data = request.get_json()

    return jsonify({
        'success': True,
        'result': _mock_actions()
    })


# ============== AI Assumptions ==============

@bp.route('/ai/whatif', methods=['POST'])
def whatif_analysis():
    """What-if analysis"""
    data = request.get_json()
    question = data.get('question', '')

    # Mock response
    return jsonify({
        'success': True,
        'result': {
            'question': question,
            'analysis': 'Based on your data, this would result in approximately X. Consider the trade-offs.',
            'pros': ['Increased profit margin', 'Better inventory turnover'],
            'cons': ['Potential customer pushback', 'Volume may decrease']
        }
    })


@bp.route('/ai/ask', methods=['POST'])
def ask_ai():
    """Ask AI a question"""
    data = request.get_json()
    question = data.get('question', '')

    # Mock response
    return jsonify({
        'success': True,
        'result': {
            'question': question,
            'answer': 'Based on your data: The analysis shows that sales patterns indicate...'
        }
    })


# ============== External Data ==============

@bp.route('/external/fetch', methods=['POST'])
def fetch_external():
    """Fetch external data from APIs"""
    data = request.get_json()
    sources = data.get('sources', [])

    return jsonify({
        'success': True,
        'result': {
            'trends': [
                {'term': 'Milo', 'search': 85, 'change': '+85%'},
                {'term': 'Nescafe', 'search': 72, 'change': '+72%'},
            ],
            'weather': [
                {'day': 'Mon', 'temp': 32, 'condition': 'sunny'},
                {'day': 'Tue', 'temp': 31, 'condition': 'cloudy'},
            ],
            'holidays': [
                {'date': '2026-04-20', 'name': 'School Holidays', 'type': 'school'},
            ]
        }
    })


# ============== Mock Helpers ==============

def _mock_data_analysis():
    return {
        'total_revenue': 2450,
        'total_expenses': 1170,
        'profit': 1280,
        'profit_margin': 52,
        'mom_change': 15,
        'top_products': [
            {'name': 'Milo 50g', 'qty': 120},
            {'name': 'Maggi', 'qty': 95},
            {'name': 'Biscuit', 'qty': 88},
        ]
    }

def _mock_predictions():
    return {
        'forecast': [
            {'day': 'Tomorrow', 'predicted': 400, 'range': '350-450'},
            {'day': 'Day 2', 'predicted': 420, 'range': '380-460'},
        ],
        'trend': 'upward',
        'seasonality': [
            {'period': 'Ramadan', 'impact': '+45%'},
            {'period': 'School Holidays', 'impact': '+25%'},
        ]
    }

def _mock_actions():
    return {
        'inventory': [
            {'text': 'Reorder Milo - below reorder level', 'priority': 'high'},
        ],
        'sales': [
            {'text': 'Run Tuesday promotion', 'priority': 'medium'},
        ],
        'trending': [
            {'text': 'Stock Nescafe - trending +85%', 'priority': 'high'},
        ],
        'margins': [
            {'item': 'Power', 'margin': 35, 'suggestion': 'Consider price increase'},
            {'item': 'Milo', 'margin': 30, 'suggestion': 'Healthy margin'},
        ]
    }

def _mock_ai_assumptions():
    return {
        'whatif': [
            {'question': 'What if I raise prices by 10%?', 'result': 'Profit +RM800/month'},
        ],
        'ask': [
            {'question': 'Why are Tuesday sales low?', 'result': 'Mid-week pattern'},
        ]
    }
