import openai
from flask import current_app
from app.models.ai_model_settings import AIModelSettings
from app.models.message import Message
from app.models.text_example import TextExample
from backend.app.models.clients import Client

def generate_ai_response(profile, incoming_message, sender_number):
    """Generate AI response for an incoming message"""
    # Get AI settings for the profile
    ai_settings = profile.ai_settings
    if not ai_settings:
        # Use default settings if not set
        ai_settings = AIModelSettings(
            profile_id=profile.id,
            model_version=current_app.config['OPENAI_MODEL'],
            temperature=0.7,
            response_length=150
        )
    
    # Get recent conversation history
    conversation = get_conversation_history(profile.id, sender_number)
    
    # Get client information
    client = Client.query.filter_by(phone_number=sender_number).first()
    client_name = client.name if client and client.name else "the client"
    
    # Get examples of profile's texting style
    examples = TextExample.query.filter_by(profile_id=profile.id).order_by(TextExample.timestamp).limit(20).all()
    
    # Create system prompt
    system_prompt = create_system_prompt(profile, client, examples)
    
    # Prepare conversation for AI
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    # Add conversation history
    for msg in conversation:
        role = "user" if msg.is_incoming else "assistant"
        messages.append({"role": role, "content": msg.content})
    
    # Add current message
    messages.append({"role": "user", "content": incoming_message})
    
    # Set up OpenAI API key
    openai.api_key = current_app.config['OPENAI_API_KEY']
    
    try:
        # Generate response
        response = openai.ChatCompletion.create(
            model=ai_settings.model_version,
            messages=messages,
            max_tokens=ai_settings.response_length,
            temperature=ai_settings.temperature,
        )
        
        # Extract the generated text
        generated_text = response.choices[0].message.content
        
        return generated_text
    except Exception as e:
        current_app.logger.error(f"Error generating AI response: {e}")
        return None

def get_conversation_history(profile_id, client_phone, limit=10):
    """Get recent conversation history between profile and client"""
    messages = Message.query.filter(
        Message.profile_id == profile_id,
        Message.sender_number == client_phone
    ).order_by(Message.timestamp.desc()).limit(limit).all()
    
    # Reverse to get chronological order
    return messages[::-1]

def create_system_prompt(profile, client, examples):
    """Create system prompt for AI response generation"""
    # Basic information about the profile
    prompt = f"""
    You are responding as {profile.name}, an escort. Mimic their texting style based on the examples provided.
    
    IMPORTANT GUIDELINES:
    1. Keep your responses brief and natural like text messages (1-3 sentences max)
    2. NEVER mention explicit services or prices
    3. If asked about location or meeting details, suggest continuing the conversation but don't make specific commitments
    4. Do not mention that you're an AI - respond as if you're the actual person
    5. If messages contain suspicious content, be vague or change the subject
    """
    
    # Add client-specific information
    if client:
        prompt += f"\nClient information:"
        if client.name:
            prompt += f"\n- Name: {client.name}"
        if client.notes:
            prompt += f"\n- Notes: {client.notes}"
        if client.is_regular:
            prompt += f"\n- This is a regular client. Be more familiar and friendly."
    
    # Add custom instructions from AI settings
    if profile.ai_settings and profile.ai_settings.custom_instructions:
        prompt += f"\n\nCustom instructions:\n{profile.ai_settings.custom_instructions}"
    
    # Add style notes
    if profile.ai_settings and profile.ai_settings.style_notes:
        prompt += f"\n\nWriting style notes:\n{profile.ai_settings.style_notes}"
    
    # Add examples of writing style
    if examples:
        prompt += "\n\nExamples of my texting style:"
        for ex in examples:
            sender = "Client" if ex.is_incoming else "Me"
            prompt += f"\n{sender}: {ex.content}"
    
    return prompt
