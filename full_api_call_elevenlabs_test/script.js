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
let conversationMode = null;

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
        const response = await fetch('http://localhost:3001/api/get-signed-url');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Signed URL obtained');
        return data.signedUrl;
    } catch (error) {
        console.error('Connection error:', error);
        connectionStatus.textContent = 'Server Connection Failed';
        throw error;
    }
}

async function sendTextMessage() {
    const message = textInput.value.trim();
    
    if (!message || !conversation) return;

    try {
        console.log('Sending message:', message);
        
        // Display user message
        addMessage(message, true);
        
        // Clear input
        textInput.value = '';
        
        // Send to agent - use the correct method
        await conversation.sendUserMessage({
            text: message
        });
        
        console.log('Message sent successfully');
        
    } catch (error) {
        console.error('Failed to send message:', error);
        addMessage('Error: Failed to send message - ' + error.message, false);
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
        console.log('Starting conversation in mode:', conversationMode);

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
            // For text mode, we need to create a "dummy" audio context
            // to satisfy the SDK but never actually use it
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            conversation = await Conversation.startSession({
                signedUrl,
                // Create a silent audio stream to prevent worklet errors
                audio: {
                    input: {
                        // Provide a silent stream instead of user microphone
                        stream: audioContext.createMediaStreamDestination().stream
                    },
                    output: {
                        // Mute output
                        muted: true
                    }
                },
                onConnect: () => {
                    console.log('✓ Text conversation connected');
                    connectionStatus.textContent = 'Connected';
                    textInput.disabled = false;
                    sendButton.disabled = false;
                    chatContainer.style.display = 'block';
                    agentStatus.textContent = 'ready for text';
                },
                onDisconnect: () => {
                    console.log('✗ Conversation disconnected');
                    connectionStatus.textContent = 'Disconnected';
                    textInput.disabled = true;
                    sendButton.disabled = true;
                    agentStatus.textContent = 'disconnected';
                },
                onError: (error) => {
                    console.error('✗ Text conversation error:', error);
                    connectionStatus.textContent = 'Error: ' + error.message;
                    addMessage('Error: ' + error.message, false);
                },
                onMessage: (message) => {
                    console.log('📨 Message received:', message);
                    
                    // Handle AI messages
                    if (message.source === 'ai' && message.message) {
                        console.log('✓ Displaying AI message:', message.message);
                        addMessage(message.message, false);
                    }
                },
                onStatusChange: (status) => {
                    console.log('📊 Status changed:', status);
                },
                onModeChange: (mode) => {
                    console.log('🔄 Mode changed:', mode);
                }
            });
            
            console.log('Conversation object created');
        }

    } catch (error) {
        console.error('✗ Failed to start conversation:', error);
        connectionStatus.textContent = 'Connection Failed';
        if (conversationMode === 'text') {
            addMessage('Failed to connect: ' + error.message, false);
        }
        throw error;
    }
}

async function stopConversation() {
    console.log('Stopping conversation...');
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