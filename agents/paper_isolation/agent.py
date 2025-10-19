import boto3
import json
import time

bedrock_agent = boto3.client('bedrock-agent', region_name='us-east-2')
s3_client = boto3.client('s3', region_name='us-east-2')

# Configuration
AGENT_NAME = 'paper-isolation-agent'
BUCKET_NAME = 'agentsdubhacks2025'  # Change this
LAMBDA_ARN = 'arn:aws:lambda:us-east-2:205930618404:function:paper-isolate'
ROLE_ARN = 'arn:aws:iam::205930618404:role/AmazonBedrockExecutionRoleForAgents'

def wait_for_agent_status(agent_id, desired_status='NOT_PREPARED', max_wait=300):
    """Wait for agent to reach desired status"""
    print(f"⏳ Waiting for agent to reach status: {desired_status}")
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        try:
            response = bedrock_agent.get_agent(agentId=agent_id)
            current_status = response['agent']['agentStatus']
            print(f"   Current status: {current_status}")
            
            if current_status == desired_status:
                print(f"✅ Agent reached status: {desired_status}")
                return True
            
            if current_status == 'FAILED':
                print(f"❌ Agent creation failed")
                return False
                
            time.sleep(5)  # Wait 5 seconds before checking again
            
        except Exception as e:
            print(f"Error checking agent status: {e}")
            time.sleep(5)
    
    print(f"⚠️ Timeout waiting for agent status")
    return False

def wait_for_agent_alias(agent_id, alias_id, max_wait=300):
    """Wait for agent alias to be ready"""
    print(f"⏳ Waiting for agent alias to be ready")
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        try:
            response = bedrock_agent.get_agent_alias(
                agentId=agent_id,
                agentAliasId=alias_id
            )
            status = response['agentAlias']['agentAliasStatus']
            print(f"   Alias status: {status}")
            
            if status == 'PREPARED':
                print(f"✅ Agent alias is ready")
                return True
            
            if status == 'FAILED':
                print(f"❌ Agent alias preparation failed")
                return False
                
            time.sleep(5)
            
        except Exception as e:
            print(f"Error checking alias status: {e}")
            time.sleep(5)
    
    print(f"⚠️ Timeout waiting for alias")
    return False

# Upload schema to S3
print("📤 Uploading schema to S3...")
with open('paper-isolation-schema.json', 'r') as f:
    schema = f.read()

s3_client.put_object(
    Bucket=BUCKET_NAME,
    Key='schemas/paper-isolation-schema.json',
    Body=schema
)
print("✅ Schema uploaded")

# Create agent
print(f"\n🤖 Creating agent: {AGENT_NAME}")
agent_response = bedrock_agent.create_agent(
    agentName=AGENT_NAME,
    foundationModel='anthropic.claude-3-sonnet-20240229-v1:0',
    instruction='''You are a paper isolation agent. Your job is to:

1. Accept images containing paper documents (as base64 strings or file paths)
2. Process the image to isolate just the paper from the background
3. Return the isolated paper image as base64

When a user provides an image:
- If they provide a file path, read and encode it as base64
- Call the isolate_paper function with the base64 image
- Return the isolated image result

You are the first step in a document processing pipeline. After isolating the paper, 
inform the user that the paper has been successfully isolated and is ready for the next processing step.''',
    agentResourceRoleArn=ROLE_ARN,
    idleSessionTTLInSeconds=600
)

agent_id = agent_response['agent']['agentId']
print(f"✅ Created agent: {agent_id}")

# Wait for agent to be ready (NOT_PREPARED status means ready for action groups)
if not wait_for_agent_status(agent_id, 'NOT_PREPARED'):
    print("❌ Agent creation failed or timed out")
    exit(1)

# Create action group
print(f"\n🔧 Creating action group...")
action_group_response = bedrock_agent.create_agent_action_group(
    agentId=agent_id,
    agentVersion='DRAFT',
    actionGroupName='paper-isolation-actions',
    actionGroupExecutor={
        'lambda': LAMBDA_ARN
    },
    apiSchema={
        's3': {
            's3BucketName': BUCKET_NAME,
            's3ObjectKey': 'schemas/paper-isolation-schema.json'
        }
    },
    description='Actions for isolating paper from images'
)

print(f"✅ Created action group: {action_group_response['agentActionGroup']['actionGroupId']}")

# Wait a bit before preparing
print("\n⏳ Waiting before preparing agent...")
time.sleep(10)

# Prepare agent
print("🔄 Preparing agent...")
prepare_response = bedrock_agent.prepare_agent(agentId=agent_id)
print(f"✅ Agent preparation started")

# Wait for agent to be prepared
if not wait_for_agent_status(agent_id, 'PREPARED'):
    print("⚠️ Agent preparation timed out, but continuing...")

# Create alias
print(f"\n🏷️ Creating alias...")
alias_response = bedrock_agent.create_agent_alias(
    agentId=agent_id,
    agentAliasName='production',
    description='Production alias for paper isolation agent'
)

alias_id = alias_response['agentAlias']['agentAliasId']
print(f"✅ Created alias: {alias_id}")

# Wait for alias to be ready
if not wait_for_agent_alias(agent_id, alias_id):
    print("⚠️ Alias preparation timed out")

# Save configuration
config = {
    'agent_id': agent_id,
    'alias_id': alias_id,
    'agent_name': AGENT_NAME,
    'region': 'us-east-2'
}

with open('agent_config.json', 'w') as f:
    json.dump(config, f, indent=2)

print(f"\n🎉 Agent setup complete!")
print(f"Agent ID: {agent_id}")
print(f"Alias ID: {alias_id}")
print(f"\n📝 Configuration saved to agent_config.json")
print(f"\n🚀 You can now test the agent with test_agent.py")
