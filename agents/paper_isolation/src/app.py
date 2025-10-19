import json, os, datetime
import boto3

MODEL_ID = os.environ.get("MODEL_ID", "openai.gpt-oss-120b-1:0")
bedrock = boto3.client("bedrock-runtime")

SYSTEM_PROMPT = """You are a small Bedrock agent.
If a tool is needed, respond with ONLY this JSON (no extra text):
{"tool":"<name>","args":{...}}
Available tools:
- get_time(zone?) -> returns current time, zone optional (e.g., 'UTC', 'America/Los_Angeles')
- calc(op, a, b) -> op in [add, sub, mul, div]; a and b are numbers.
If no tool is needed, just answer normally (no JSON). Be concise.
"""

def call_bedrock(user_msg: str) -> str:
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_msg}],
        "max_tokens": 400,
        "temperature": 0.2,
    }
    resp = bedrock.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(body).encode("utf-8"),
    )
    payload = json.loads(resp["body"].read())
    text = "".join([p.get("text","") for p in payload.get("content",[]) if p.get("type")=="text"])
    return text.strip()

def tool_get_time(zone: str | None):
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo(zone) if zone else datetime.datetime.now().astimezone().tzinfo
    except Exception:
        tz = datetime.datetime.now().astimezone().tzinfo
    now = datetime.datetime.now(tz)
    return now.strftime("%Y-%m-%d %H:%M:%S %Z")

def tool_calc(op: str, a, b):
    try:
        x = float(a); y = float(b)
        if op == "add": return x + y
        if op == "sub": return x - y
        if op == "mul": return x * y
        if op == "div": return x / y if y != 0 else "Error: division by zero"
        return f"Unknown op: {op}"
    except Exception as e:
        return f"Calc error: {e}"

def maybe_tool_call(text: str):
    try:
        obj = json.loads(text)
        if isinstance(obj, dict) and "tool" in obj:
            return obj
    except Exception:
        pass
    return None

def handler(event, context):
    body = json.loads(event.get("body") or "{}")
    msg = (body.get("message") or "").strip()
    if not msg:
        return {"statusCode": 400, "body": json.dumps({"error":"message required"})}

    model_reply = call_bedrock(msg)
    call = maybe_tool_call(model_reply)

    if call:
        name = call.get("tool")
        args = call.get("args", {}) or {}
        try:
            if name == "get_time":
                result = tool_get_time(args.get("zone"))
            elif name == "calc":
                result = tool_calc(args.get("op",""), args.get("a",0), args.get("b",0))
            else:
                result = f"Unknown tool: {name}"
            final = f"{result}"
        except Exception as e:
            final = f"Tool error: {e}"
    else:
        final = model_reply or "I had trouble generating a response."

    return {
        "statusCode": 200,
        "headers": {"Content-Type":"application/json"},
        "body": json.dumps({"reply": final})
    }
