"""
Z.AI GLM Service
Handles API calls to Z.AI's GLM (General Language Model)
"""

import requests
import json
import os
from flask import current_app


def get_glm_config():
    """Get GLM API configuration from app config"""
    return {
        'api_key': current_app.config.get('ZAI_API_KEY'),
        'api_url': current_app.config.get('ZAI_API_URL')
    }


def call_glm(prompt, temperature=0.7, max_tokens=1000):
    """
    Call Z.AI GLM API with a simple prompt

    Args:
        prompt: The input prompt/text
        temperature: Sampling temperature (0-1)
        max_tokens: Maximum tokens to generate

    Returns:
        dict: Response from GLM API
    """
    config = get_glm_config()

    if not config['api_key']:
        return _mock_glm_response(prompt)

    headers = {
        'Authorization': f'Bearer {config["api_key"]}',
        'Content-Type': 'application/json'
    }

    payload = {
        'prompt': prompt,
        'temperature': temperature,
        'max_tokens': max_tokens
    }

    try:
        response = requests.post(
            config['api_url'],
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f'API error: {response.status_code} - {response.text}')

    except requests.exceptions.RequestException as e:
        raise Exception(f'Request failed: {str(e)}')


def call_glm_with_context(prompt, context=None, system_prompt='', temperature=0.7, max_tokens=1000):
    """
    Call Z.AI GLM API with context/history

    Args:
        prompt: The input prompt
        context: List of previous messages for context
        system_prompt: System instructions
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate

    Returns:
        dict: Response from GLM API
    """
    config = get_glm_config()

    if not config['api_key']:
        return _mock_glm_response(prompt)

    messages = []

    if system_prompt:
        messages.append({
            'role': 'system',
            'content': system_prompt
        })

    if context:
        messages.extend(context)

    messages.append({
        'role': 'user',
        'content': prompt
    })

    headers = {
        'Authorization': f'Bearer {config["api_key"]}',
        'Content-Type': 'application/json'
    }

    payload = {
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    }

    try:
        response = requests.post(
            f'{config["api_url"]}/chat',
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f'API error: {response.status_code} - {response.text}')

    except requests.exceptions.RequestException as e:
        raise Exception(f'Request failed: {str(e)}')


def _mock_glm_response(prompt):
    """
    Mock GLM response when API key is not configured
    For testing without API key
    """
    return {
        'mock': True,
        'prompt': prompt,
        'response': f'Mock response for: {prompt[:50]}...',
        'note': 'Add your ZAI_API_KEY in .env to use real GLM API'
    }


def parse_json_response(response_text):
    """
    Parse JSON from GLM response text

    Args:
        response_text: Raw text response from GLM

    Returns:
        dict: Parsed JSON object
    """
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        json_match = None
        import re
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {'raw_text': response_text}