"""
GLM Service - Multi-provider AI API
Currently using Google Gemini API format.
Previous Anthropic format is commented out below.
"""

import requests
import json
import os
from flask import current_app


def get_api_config():
    """Get API configuration from app config"""
    return {
        'api_key': current_app.config.get('ZAI_API_KEY'),
        'api_url': current_app.config.get('ZAI_API_URL')
    }


def call_glm(prompt, system_prompt='', temperature=0.7, max_tokens=1024):
    """
    Call AI API with a simple prompt (Gemini format)

    Args:
        prompt: The input prompt/text
        system_prompt: Optional system instructions
        temperature: Sampling temperature (0-1)
        max_tokens: Maximum tokens to generate

    Returns:
        str: Text response from the AI
    """
    config = get_api_config()

    if not config['api_key']:
        return _mock_glm_response(prompt)

    payload = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {
            'temperature': temperature,
            'maxOutputTokens': max_tokens
        }
    }

    if system_prompt:
        payload['systemInstruction'] = {'parts': [{'text': system_prompt}]}

    try:
        response = requests.post(
            config['api_url'],
            headers={
                'Content-Type': 'application/json',
                'X-goog-api-key': config['api_key']
            },
            json=payload,
            timeout=120
        )

        if response.status_code == 200:
            data = response.json()
            return _extract_gemini_text(data)
        else:
            raise Exception(f'API error: {response.status_code} - {response.text[:300]}')

    except requests.exceptions.RequestException as e:
        raise Exception(f'Request failed: {str(e)}')


def call_glm_with_context(prompt, context=None, system_prompt='', temperature=0.7, max_tokens=1024):
    """
    Call AI API with conversation context (Gemini format)

    Args:
        prompt: The input prompt
        context: List of previous messages [{role, content}, ...]
        system_prompt: System instructions
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate

    Returns:
        str: Text response from the AI
    """
    config = get_api_config()

    if not config['api_key']:
        return _mock_glm_response(prompt)

    contents = []

    if context:
        for msg in context:
            role = 'user' if msg.get('role') in ('user', None) else 'model'
            contents.append({
                'role': role,
                'parts': [{'text': msg['content']}]
            })

    contents.append({
        'role': 'user',
        'parts': [{'text': prompt}]
    })

    payload = {
        'contents': contents,
        'generationConfig': {
            'temperature': temperature,
            'maxOutputTokens': max_tokens
        }
    }

    if system_prompt:
        payload['systemInstruction'] = {'parts': [{'text': system_prompt}]}

    try:
        response = requests.post(
            config['api_url'],
            headers={
                'Content-Type': 'application/json',
                'X-goog-api-key': config['api_key']
            },
            json=payload,
            timeout=120
        )

        if response.status_code == 200:
            data = response.json()
            return _extract_gemini_text(data)
        else:
            raise Exception(f'API error: {response.status_code} - {response.text[:300]}')

    except requests.exceptions.RequestException as e:
        raise Exception(f'Request failed: {str(e)}')


def _extract_gemini_text(response_data):
    """Extract text from Gemini API response format"""
    try:
        candidates = response_data.get('candidates', [])
        if candidates:
            parts = candidates[0].get('content', {}).get('parts', [])
            texts = [p['text'] for p in parts if 'text' in p]
            if texts:
                return '\n'.join(texts)
    except (IndexError, KeyError, TypeError):
        pass
    return json.dumps(response_data)


def _mock_glm_response(prompt):
    """Mock response when API key is not configured"""
    return f'Mock response for: {prompt[:50]}... (Add ZAI_API_KEY in .env to use real API)'


def parse_json_response(response_text):
    """Parse JSON from AI response text, handling markdown code blocks"""
    import re

    cleaned = re.sub(r'```json\s*', '', response_text)
    cleaned = re.sub(r'```\s*', '', cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {'raw_text': response_text}


# ============== Previous Anthropic Format (commented out) ==============
#
# def call_glm_anthropic(prompt, system_prompt='', temperature=0.7, max_tokens=1024):
#     config = get_api_config()
#     if not config['api_key']:
#         return _mock_glm_response(prompt)
#
#     messages = [{'role': 'user', 'content': prompt}]
#     headers = {
#         'x-api-key': config['api_key'],
#         'Content-Type': 'application/json',
#         'anthropic-version': '2023-06-01'
#     }
#     payload = {
#         'model': 'ilmu-glm-5.1',
#         'messages': messages,
#         'temperature': temperature,
#         'max_tokens': max_tokens
#     }
#     if system_prompt:
#         payload['system'] = system_prompt
#
#     try:
#         response = requests.post(
#             f'{config["api_url"]}/v1/messages',
#             headers=headers,
#             json=payload,
#             timeout=120
#         )
#         if response.status_code == 200:
#             data = response.json()
#             return _extract_anthropic_text(data)
#         else:
#             raise Exception(f'API error: {response.status_code} - {response.text[:300]}')
#     except requests.exceptions.RequestException as e:
#         raise Exception(f'Request failed: {str(e)}')
#
# def _extract_anthropic_text(response_data):
#     content = response_data.get('content', [])
#     texts = []
#     for block in content:
#         if block.get('type') == 'text':
#             texts.append(block['text'])
#     return '\n'.join(texts) if texts else json.dumps(response_data)
