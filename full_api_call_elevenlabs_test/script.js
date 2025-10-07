import { Conversation } from '@elevenlabs/client';

const modeSelection = document.getElementById('modeSelection');
const voiceButton = document.getElementById('voiceButton');
const textButton = document.getElementById('textButton');
const voiceStartButton = document.getElementById('voiceStartButton');
const voiceStopButton = document.getElementById('voiceStopButton');
const connectionStatus = document.getElementById('connectionStatus');
const agentStatus = document.getElementById('agentStatus');
const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const textInput = document.getElementById('textInput');
const sendButton = document.getElementById('sendButton');
const btnBar = document.getElementById('btnBar');

let conversation;
let conversationMode = null; // 'voice' or 'text'

// Mode selection handlers
voiceButton.addEventListener('click', () => {
    conversationMode = 'voice';
    modeSelection.style.display = 'none';
    voiceStartButton.style.display = 'block';
    chatContainer.style.display = 'none';
});

textButton.addEventListener('click', () => {
    conversationMode = 'text';
    modeSelection.style.display = 'none';
    chatContainer.style.display = 'block';
    btnBar.style.display = 'none';
    startConversation();
});

async function getSignedUrl() {
    try {
        // Test server connection first
        const testResponse = await fetch('http://localhost:3001/test');
        console.log('Test connection successful');

        const response = await fetch('http://localhost:3001/api/get-signed-url');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.signedUrl;
    } catch (error) {
        console.error('Connection error:', error);
        connectionStatus.textContent = 'Server Connection Failed';
        throw error;
    }
}

async function sendTextMessage() {
    const textInput = document.getElementById('textInput');
    const message = textInput.value.trim();
    
    if (!message || !conversation) return;

    try {
        // Check if conversation is still connected
        if (!conversation || conversation.status === 'disconnected') {
            console.error('Conversation is not connected');
            addMessage('Error: Connection lost. Please refresh and try again.', false);
            return;
        }

        // Display user message
        addMessage(message, true);
        
        // Clear input
        textInput.value = '';
        
        // Send to agent using sendUserMessage (non-blocking)
        conversation.sendUserMessage({
            text: message
        });
        
    } catch (error) {
        console.error('Failed to send message:', error);
        addMessage('Error: Failed to send message', false);
    }
}

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'agent-message'}`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function startConversation() {
    try {
        const signedUrl = await getSignedUrl();

        // Initialize conversation based on mode
        if (conversationMode === 'voice') {
            // Request audio permission for voice mode
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            conversation = await Conversation.startSession({
                signedUrl,
                onConnect: () => {
                    connectionStatus.textContent = 'Connected';
                    voiceStartButton.disabled = true;
                    voiceStopButton.disabled = false;
                    agentStatus.textContent = 'listening';
                },
                onDisconnect: () => {
                    connectionStatus.textContent = 'Disconnected';
                    voiceStartButton.disabled = false;
                    voiceStopButton.disabled = true;
                    agentStatus.textContent = 'ready to call';
                },
                onError: (error) => {
                    console.error('Voice conversation error:', error);
                    connectionStatus.textContent = 'Error';
                },
                onModeChange: (mode) => {
                    agentStatus.textContent = mode.mode === 'speaking' ? 'speaking' : 'listening';
                }
            });
        } else if (conversationMode === 'text') {
            // Initialize text-only conversation with required overrides and message handler
            conversation = await Conversation.startSession({
                signedUrl,
                overrides: {
                    conversation: {
                        textOnly: true,  // Enable text-only mode
                    },
                    agent: {
                        firstMessage: null  // Prevent auto-disconnect from first message
                    }
                },
                onConnect: () => {
                    console.log('Text conversation connected');
                    connectionStatus.textContent = 'Connected';
                    textInput.disabled = false;
                    sendButton.disabled = false;
                    chatContainer.style.display = 'block';
                    agentStatus.textContent = 'ready for text';
                },
                onDisconnect: () => {
                    console.log('Conversation disconnected');
                    connectionStatus.textContent = 'Disconnected';
                    textInput.disabled = true;
                    sendButton.disabled = true;
                    agentStatus.textContent = 'disconnected';
                },
                onError: (error) => {
                    console.error('Text conversation error:', error);
                    connectionStatus.textContent = 'Error';
                },
                // CRITICAL: Handle agent responses via onMessage
                onMessage: (message) => {
                    console.log('Message received:', message);
                    if (message.type === 'agent_response') {
                        console.log('Agent:', message.text);
                        // Display agent's text response in UI
                        addMessage(message.text, false);
                    } else if (message.type === 'interruption') {
                        console.log('Conversation interrupted');
                    }
                }
            });
        }

    } catch (error) {
        console.error('Failed to start conversation:', error);
        connectionStatus.textContent = 'Connection Failed';
        throw error;
    }
}

async function stopConversation() {
    if (conversation) {
        await conversation.endSession();
        conversation = null;
    }
    
    // Reset UI
    modeSelection.style.display = 'block';
    voiceStartButton.style.display = 'none';
    voiceStopButton.disabled = true;
    chatContainer.style.display = 'none';
    chatMessages.innerHTML = '';
    textInput.value = '';
    conversationMode = null;
}

// Event listeners
voiceStartButton.addEventListener('click', startConversation);
voiceStopButton.addEventListener('click', stopConversation);
sendButton.addEventListener('click', sendTextMessage);
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendTextMessage();
    }
});