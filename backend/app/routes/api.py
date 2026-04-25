from flask import Blueprint, request, jsonify
from app.services.glm_service import call_glm, call_glm_with_context, parse_json_response

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
    """What-if analysis powered by GLM"""
    data = request.get_json()
    question = data.get('question', '')
    business_data = data.get('business_data', {})

    system_prompt = """You are an SME business advisor for a mini market in Malaysia.
Analyze what-if scenarios and provide practical advice.
Structure your response with these sections:
- Analysis: detailed analysis of the scenario
- Pros: list positive outcomes
- Cons: list risks or negative outcomes
- Recommendation: clear actionable recommendation
Keep responses practical and specific to Malaysian mini market context. Use RM for currency."""

    business_context = _format_business_context(business_data)
    full_prompt = f"Business Data:\n{business_context}\n\nWhat-if Question: {question}"

    try:
        result = call_glm_with_context(full_prompt, system_prompt=system_prompt, temperature=0.7, max_tokens=1024)

        # Try JSON parse first, fall back to raw text
        parsed = parse_json_response(result)
        if 'raw_text' not in parsed:
            return jsonify({
                'success': True,
                'result': {
                    'question': question,
                    'analysis': parsed.get('analysis', ''),
                    'pros': parsed.get('pros', []),
                    'cons': parsed.get('cons', []),
                    'recommendation': parsed.get('recommendation', '')
                }
            })

        # Return raw text as the analysis
        return jsonify({
            'success': True,
            'result': {
                'question': question,
                'analysis': result,
                'pros': [],
                'cons': [],
                'recommendation': ''
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/ai/ask', methods=['POST'])
def ask_ai():
    """Ask AI a question powered by GLM"""
    data = request.get_json()
    question = data.get('question', '')
    business_data = data.get('business_data', {})

    system_prompt = """You are an SME business advisor for a mini market in Malaysia.
Answer business questions with practical, actionable advice.
Keep answers concise but informative. Use RM for currency.
Reference specific data when available."""

    business_context = _format_business_context(business_data)
    full_prompt = f"Business Data:\n{business_context}\n\nQuestion: {question}"

    try:
        result = call_glm_with_context(full_prompt, system_prompt=system_prompt, temperature=0.7, max_tokens=1024)
        return jsonify({
            'success': True,
            'result': {
                'question': question,
                'answer': result
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


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


# ============== Helpers ==============

def _format_business_context(business_data):
    """Format business data into a readable context string for GLM prompts"""
    if not business_data:
        return "No business data provided yet."

    parts = []

    sales = business_data.get('sales', [])
    if sales:
        total_revenue = sum(float(s.get('revenue', 0)) for s in sales)
        parts.append(f"Sales entries: {len(sales)}, Total Revenue: RM{total_revenue:.2f}")

    expenses = business_data.get('expenses', [])
    if expenses:
        total_expenses = sum(float(e.get('amount', 0)) for e in expenses)
        parts.append(f"Expense entries: {len(expenses)}, Total Expenses: RM{total_expenses:.2f}")

    products = business_data.get('products', [])
    if products:
        product_names = [p.get('name', '') for p in products[:10]]
        parts.append(f"Products: {', '.join(product_names)}")

    inventory = business_data.get('inventory', [])
    if inventory:
        low_stock = [i.get('name', '') for i in inventory if i.get('quantity', 999) <= i.get('reorderLevel', 0)]
        if low_stock:
            parts.append(f"Low stock items: {', '.join(low_stock)}")

    staff = business_data.get('staff', [])
    if staff:
        total_staff_cost = sum(float(s.get('count', 0)) * float(s.get('wage', 0)) for s in staff)
        parts.append(f"Staff cost: RM{total_staff_cost:.2f}/month")

    return '\n'.join(parts) if parts else "No business data provided yet."


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
