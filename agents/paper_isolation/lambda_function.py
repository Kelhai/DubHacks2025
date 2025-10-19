import boto3
import json
import base64
import requests
import os

def lambda_handler(event, context):
    """
    Lambda function to handle image processing for Bedrock Agent
    """
    print(f"Event received: {json.dumps(event)}")
    
    action_group = event.get('actionGroup', '')
    function = event.get('function', '')
    parameters = event.get('parameters', [])
    
    # Helper to get parameter value
    def get_param(name):
        for param in parameters:
            if param['name'] == name:
                return param['value']
        return None
    
    try:
        if function == 'isolate_paper':
            # Get the base64 image from parameters
            image_b64 = get_param('image_base64')
            
            if not image_b64:
                return error_response(action_group, function, "No image provided")
            
            # Call your API
            api_url = "https://ajtd1wi2z1.execute-api.us-east-2.amazonaws.com"
            
            print(f"Calling API: {api_url}/paper-isolate")
            
            response = requests.post(
                f"{api_url}/paper-isolate",
                json={'image': image_b64},
                timeout=60  # Increased timeout for image processing
            )
            
            print(f"API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                # Return the isolated paper image
                return {
                    'messageVersion': '1.0',
                    'response': {
                        'actionGroup': action_group,
                        'function': function,
                        'functionResponse': {
                            'responseBody': {
                                'TEXT': {
                                    'body': json.dumps({
                                        'success': True,
                                        'isolated_image_base64': result.get('image', ''),
                                        'message': 'Paper successfully isolated from image'
                                    })
                                }
                            }
                        }
                    }
                }
            else:
                error_msg = f"API call failed with status {response.status_code}: {response.text}"
                print(error_msg)
                return error_response(action_group, function, error_msg)
        
        else:
            return error_response(action_group, function, f"Unknown function: {function}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(action_group, function, str(e))

def error_response(action_group, function, error_message):
    """Helper to return error responses"""
    return {
        'messageVersion': '1.0',
        'response': {
            'actionGroup': action_group,
            'function': function,
            'functionResponse': {
                'responseBody': {
                    'TEXT': {
                        'body': json.dumps({
                            'success': False,
                            'error': error_message
                        })
                    }
                }
            }
        }
    }
