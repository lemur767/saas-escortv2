#!/bin/bash
# Dolphin-3 VPS Setup Script
# Run this on your VPS to set up Dolphin-3 LLM serving

set -e

echo "🐬 Dolphin-3 VPS Setup for SMS AI Responder"
echo "=============================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Get system info
echo "📊 System Information:"
echo "   OS: $(lsb_release -d | cut -f2)"
echo "   Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "   CPU: $(nproc) cores"
echo "   Disk: $(df -h / | tail -1 | awk '{print $4}') free"

# Check GPU
if command -v nvidia-smi &> /dev/null; then
    echo "   🎮 GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader,nounits)"
    GPU_AVAILABLE=true
    VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
    echo "   🎮 VRAM: ${VRAM} MB"
else
    echo "   💻 GPU: Not detected (using CPU)"
    GPU_AVAILABLE=false
fi

# Update system
echo ""
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install dependencies
echo "🔧 Installing dependencies..."
apt-get install -y curl wget git python3 python3-pip python3-venv htop screen tmux nginx ufw

# Install NVIDIA drivers and CUDA if GPU detected
if [[ "$GPU_AVAILABLE" == true ]]; then
    echo "🎮 Setting up GPU support..."
    
    # Check if CUDA is already installed
    if ! command -v nvcc &> /dev/null; then
        echo "Installing CUDA..."
        wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
        dpkg -i cuda-keyring_1.0-1_all.deb
        apt-get update
        apt-get -y install cuda-toolkit-12-0
        echo "⚠️  CUDA installed. You may need to reboot and run this script again."
    fi
fi

echo ""
echo "🤖 Choose Dolphin-3 deployment method:"
echo "1. vLLM (Recommended - Best performance)"
echo "2. Ollama (Easiest setup)"
echo "3. Text Generation Inference (TGI)"
echo "4. Transformers + FastAPI (Most flexible)"
echo ""

read -p "Enter your choice (1-4): " deployment_choice

case $deployment_choice in
    1)
        setup_vllm_dolphin3
        ;;
    2)
        setup_ollama_dolphin3
        ;;
    3)
        setup_tgi_dolphin3
        ;;
    4)
        setup_transformers_dolphin3
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Setup firewall
setup_firewall

# Create systemd service
create_systemd_service

echo ""
echo "🎉 Dolphin-3 Setup Complete!"
echo ""
echo "📝 Your LLM server details:"
echo "   Endpoint: http://$(curl -s ifconfig.me):$SERVICE_PORT"
echo "   Model: $MODEL_NAME"
echo "   Format: $API_FORMAT"
echo ""
echo "📋 Next steps:"
echo "1. Update your SMS backend .env file with:"
echo "   LLM_ENDPOINT=http://$(curl -s ifconfig.me):$SERVICE_PORT"
echo "   LLM_MODEL=$MODEL_NAME"
echo "   LLM_FORMAT=$API_FORMAT"
echo "2. Test the connection: curl http://$(curl -s ifconfig.me):$SERVICE_PORT/"
echo "3. Monitor the service: sudo systemctl status $SERVICE_NAME"
echo "4. View logs: sudo journalctl -u $SERVICE_NAME -f"
echo ""

function setup_vllm_dolphin3() {
    echo "🚀 Setting up vLLM with Dolphin-3..."
    
    # Create dedicated user
    useradd -m -s /bin/bash llm-server || true
    
    # Install vLLM
    pip3 install vllm accelerate
    
    if [[ "$GPU_AVAILABLE" == true ]]; then
        pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    else
        pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    fi
    
    # Choose Dolphin-3 variant
    echo ""
    echo "🐬 Choose Dolphin-3 variant:"
    echo "1. Dolphin-2.6-7B (Recommended for most use cases)"
    echo "2. Dolphin-2.7-7B (Latest version)"
    echo "3. Dolphin-2.6-13B (Higher quality, requires more VRAM/RAM)"
    echo "4. Custom Dolphin model path"
    echo ""
    read -p "Enter choice (1-4): " dolphin_choice
    
    case $dolphin_choice in
        1)
            MODEL_NAME="cognitivecomputations/dolphin-2.6-mistral-7b"
            ;;
        2)
            MODEL_NAME="cognitivecomputations/dolphin-2.7-mixtral-8x7b"
            ;;
        3)
            MODEL_NAME="cognitivecomputations/dolphin-2.6-llama2-13b"
            ;;
        4)
            read -p "Enter full model path/name: " MODEL_NAME
            ;;
        *)
            MODEL_NAME="cognitivecomputations/dolphin-2.6-mistral-7b"
            ;;
    esac
    
    SERVICE_PORT=8000
    SERVICE_NAME="dolphin3-vllm"
    API_FORMAT="openai"
    
    # Create startup script
    cat > /usr/local/bin/start-dolphin3-vllm.sh << EOF
#!/bin/bash
export CUDA_VISIBLE_DEVICES=0
python3 -m vllm.entrypoints.openai.api_server \\
    --model $MODEL_NAME \\
    --host 0.0.0.0 \\
    --port $SERVICE_PORT \\
    --tensor-parallel-size 1 \\
    --max-model-len 4096 \\
    --trust-remote-code
EOF
    
    chmod +x /usr/local/bin/start-dolphin3-vllm.sh
    
    echo "✅ vLLM Dolphin-3 setup complete!"
}

function setup_ollama_dolphin3() {
    echo "🦙 Setting up Ollama with Dolphin-3..."
    
    # Install Ollama
    curl -fsSL https://ollama.ai/install.sh | sh
    
    # Choose Dolphin variant
    echo ""
    echo "🐬 Choose Dolphin-3 variant:"
    echo "1. dolphin-mistral:7b (Recommended)"
    echo "2. dolphin-llama3:8b (Latest base)"
    echo "3. dolphin2.2-mistral:7b (Stable version)"
    echo ""
    read -p "Enter choice (1-3): " dolphin_choice
    
    case $dolphin_choice in
        1)
            MODEL_NAME="dolphin-mistral:7b"
            ;;
        2)
            MODEL_NAME="dolphin-llama3:8b"
            ;;
        3)
            MODEL_NAME="dolphin2.2-mistral:7b"
            ;;
        *)
            MODEL_NAME="dolphin-mistral:7b"
            ;;
    esac
    
    SERVICE_PORT=11434
    SERVICE_NAME="dolphin3-ollama"
    API_FORMAT="ollama"
    
    # Pull the model (this will take a while)
    echo "📥 Downloading Dolphin-3 model (this may take 10-30 minutes)..."
    ollama pull $MODEL_NAME
    
    # Create startup script
    cat > /usr/local/bin/start-dolphin3-ollama.sh << EOF
#!/bin/bash
export OLLAMA_HOST=0.0.0.0:$SERVICE_PORT
export OLLAMA_MODELS=/usr/share/ollama/.ollama/models
ollama serve
EOF
    
    chmod +x /usr/local/bin/start-dolphin3-ollama.sh
    
    echo "✅ Ollama Dolphin-3 setup complete!"
}

function setup_tgi_dolphin3() {
    echo "🤗 Setting up Text Generation Inference with Dolphin-3..."
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        echo "📦 Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker $USER
        systemctl start docker
        systemctl enable docker
    fi
    
    # Install NVIDIA Container Toolkit for GPU support
    if [[ "$GPU_AVAILABLE" == true ]]; then
        echo "🎮 Installing NVIDIA Container Toolkit..."
        distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
        curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
        curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources.list.d/nvidia-docker.list
        apt-get update && apt-get install -y nvidia-container-toolkit
        systemctl restart docker
    fi
    
    MODEL_NAME="cognitivecomputations/dolphin-2.6-mistral-7b"
    SERVICE_PORT=8080
    SERVICE_NAME="dolphin3-tgi"
    API_FORMAT="openai"
    
    # Create startup script
    if [[ "$GPU_AVAILABLE" == true ]]; then
        cat > /usr/local/bin/start-dolphin3-tgi.sh << EOF
#!/bin/bash
docker run --gpus all --shm-size 1g -p $SERVICE_PORT:80 \\
    -v /tmp/tgi-data:/data \\
    ghcr.io/huggingface/text-generation-inference:latest \\
    --model-id $MODEL_NAME \\
    --port 80 \\
    --max-input-length 2048 \\
    --max-total-tokens 4096
EOF
    else
        cat > /usr/local/bin/start-dolphin3-tgi.sh << EOF
#!/bin/bash
docker run --shm-size 1g -p $SERVICE_PORT:80 \\
    -v /tmp/tgi-data:/data \\
    ghcr.io/huggingface/text-generation-inference:latest \\
    --model-id $MODEL_NAME \\
    --port 80 \\
    --max-input-length 2048 \\
    --max-total-tokens 4096
EOF
    fi
    
    chmod +x /usr/local/bin/start-dolphin3-tgi.sh
    
    echo "✅ TGI Dolphin-3 setup complete!"
}

function setup_transformers_dolphin3() {
    echo "🤖 Setting up Transformers + FastAPI with Dolphin-3..."
    
    # Create dedicated directory
    mkdir -p /opt/dolphin3-server
    cd /opt/dolphin3-server
    
    # Install Python dependencies
    pip3 install fastapi uvicorn transformers torch accelerate bitsandbytes
    
    if [[ "$GPU_AVAILABLE" == true ]]; then
        pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    else
        pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    fi
    
    MODEL_NAME="cognitivecomputations/dolphin-2.6-mistral-7b"
    SERVICE_PORT=5000
    SERVICE_NAME="dolphin3-transformers"
    API_FORMAT="custom"
    
    # Create the FastAPI server
    cat > /opt/dolphin3-server/server.py << 'EOF'
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch
import logging
from typing import List, Dict, Optional
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Dolphin-3 LLM Server", version="1.0.0")

# Global variables for model and tokenizer
tokenizer = None
model = None
device = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: Optional[str] = None
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 150
    top_p: Optional[float] = 0.9

class GenerateRequest(BaseModel):
    system_prompt: str
    conversation: List[Dict[str, str]]
    current_message: str
    temperature: float = 0.7
    max_length: int = 150

@app.on_event("startup")
async def load_model():
    global tokenizer, model, device
    
    MODEL_NAME = "cognitivecomputations/dolphin-2.6-mistral-7b"
    
    logger.info(f"Loading Dolphin-3 model: {MODEL_NAME}")
    
    # Determine device
    if torch.cuda.is_available():
        device = "cuda"
        logger.info(f"Using GPU: {torch.cuda.get_device_name()}")
        
        # Use quantization if limited VRAM
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4"
        )
        
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            quantization_config=quantization_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16
        )
    else:
        device = "cpu"
        logger.info("Using CPU")
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            trust_remote_code=True,
            torch_dtype=torch.float32
        )
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    
    # Set padding token
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    logger.info("Model loaded successfully!")

@app.get("/")
async def health_check():
    return {
        "status": "healthy",
        "model": "Dolphin-3",
        "device": device,
        "gpu_available": torch.cuda.is_available()
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI-compatible chat completions endpoint"""
    try:
        # Convert messages to prompt
        prompt = ""
        for message in request.messages:
            if message.role == "system":
                prompt += f"<|im_start|>system\n{message.content}<|im_end|>\n"
            elif message.role == "user":
                prompt += f"<|im_start|>user\n{message.content}<|im_end|>\n"
            elif message.role == "assistant":
                prompt += f"<|im_start|>assistant\n{message.content}<|im_end|>\n"
        
        prompt += "<|im_start|>assistant\n"
        
        # Generate response
        response_text = await generate_response(
            prompt, 
            request.temperature, 
            request.max_tokens
        )
        
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }],
            "model": "dolphin-3",
            "usage": {
                "prompt_tokens": len(tokenizer.encode(prompt)),
                "completion_tokens": len(tokenizer.encode(response_text)),
                "total_tokens": len(tokenizer.encode(prompt)) + len(tokenizer.encode(response_text))
            }
        }
        
    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate")
async def generate_custom(request: GenerateRequest):
    """Custom generation endpoint"""
    try:
        # Build conversation context
        prompt = f"{request.system_prompt}\n\n"
        
        # Add conversation history
        for msg in request.conversation[-5:]:  # Last 5 messages
            role = "Human" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
        
        prompt += f"Human: {request.current_message}\nAssistant:"
        
        # Generate response
        response_text = await generate_response(
            prompt,
            request.temperature,
            request.max_length
        )
        
        return {"generated_text": response_text}
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_response(prompt: str, temperature: float, max_tokens: int) -> str:
    """Generate response using the model"""
    try:
        # Tokenize input
        inputs = tokenizer.encode(prompt, return_tensors="pt").to(device)
        
        # Generate
        with torch.no_grad():
            outputs = model.generate(
                inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                top_p=0.9
            )
        
        # Decode response
        response = tokenizer.decode(
            outputs[0][inputs.shape[1]:], 
            skip_special_tokens=True
        ).strip()
        
        # Clean up response
        if "<|im_end|>" in response:
            response = response.split("<|im_end|>")[0]
        
        return response
        
    except Exception as e:
        logger.error(f"Response generation error: {e}")
        raise Exception(f"Generation failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")
EOF
    
    # Create startup script
    cat > /usr/local/bin/start-dolphin3-transformers.sh << EOF
#!/bin/bash
cd /opt/dolphin3-server
python3 server.py
EOF
    
    chmod +x /usr/local/bin/start-dolphin3-transformers.sh
    
    echo "✅ Transformers Dolphin-3 setup complete!"
}

function setup_firewall() {
    echo "🔥 Configuring firewall..."
    
    # Reset and configure UFW
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow $SERVICE_PORT
    ufw --force enable
    
    echo "✅ Firewall configured - Port $SERVICE_PORT is open"
}

function create_systemd_service() {
    echo "⚙️  Creating systemd service..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Dolphin-3 LLM Server for SMS AI Responder
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt
ExecStart=/usr/local/bin/start-$SERVICE_NAME.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=PYTHONPATH=/usr/local/lib/python3.*/site-packages

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    # Wait and check status
    echo "⏳ Starting service (this may take a few minutes for model loading)..."
    sleep 10
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo "✅ Service started successfully!"
    else
        echo "⚠️  Service may still be starting. Check with:"
        echo "   sudo systemctl status $SERVICE_NAME"
        echo "   sudo journalctl -u $SERVICE_NAME -f"
    fi
}