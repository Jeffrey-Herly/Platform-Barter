/**
 * Chat WebSocket Client
 * Real-time WebSocket client untuk chat
 */

class ChatWebSocket {
    constructor(options = {}) {
        this.transactionId = options.transactionId;
        this.userId = options.userId;
        this.messageContainer = options.messageContainer || '#chat-messages';
        this.newMessageCallback = options.onNewMessage || null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3 seconds
        this.heartbeatInterval = null;
        this.isConnected = false;
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[ChatWebSocket] Already connected');
            return; // Already connected
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        console.log('[ChatWebSocket] Attempting to connect to:', wsUrl);
        console.log('[ChatWebSocket] Transaction ID:', this.transactionId);
        console.log('[ChatWebSocket] User ID:', this.userId);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = (event) => {
                console.log('[ChatWebSocket] ✅ WebSocket connection opened successfully');
                this.isConnected = true;
                this.reconnectAttempts = 0;

                // Join room
                this.joinRoom();

                // Start heartbeat
                this.startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                console.log('[ChatWebSocket] 📨 Received message:', event.data);
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[ChatWebSocket] Error parsing message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[ChatWebSocket] ❌ Disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.stopHeartbeat();

                // Attempt reconnect if not intentional close
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('[ChatWebSocket] 🚨 Connection error:', error);
                this.isConnected = false;
            };

        } catch (error) {
            console.error('[ChatWebSocket] Failed to create WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.stopHeartbeat();
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.isConnected = false;
    }

    /**
     * Join chat room
     */
    joinRoom() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[ChatWebSocket] 🚪 Joining room:', this.transactionId, 'as user:', this.userId);
            this.ws.send(JSON.stringify({
                type: 'join',
                transactionId: this.transactionId,
                userId: this.userId
            }));
        } else {
            console.warn('[ChatWebSocket] Cannot join room: WebSocket not connected');
        }
    }

    /**
     * Leave chat room
     */
    leaveRoom() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'leave'
            }));
        }
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Schedule reconnect attempt
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

        console.log(`[ChatWebSocket] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(message) {
        console.log('[ChatWebSocket] 📨 Processing message type:', message.type);
        switch (message.type) {
            case 'joined':
                console.log('[ChatWebSocket] ✅ Successfully joined room:', message.transactionId);
                break;

            case 'left':
                console.log('[ChatWebSocket] 👋 Left room');
                break;

            case 'new_message':
                console.log('[ChatWebSocket] 💬 New message received:', message.data);
                this.handleNewMessage(message.data);
                break;

            case 'pong':
                console.log('[ChatWebSocket] 💓 Heartbeat pong received');
                break;

            default:
                console.log('[ChatWebSocket] ❓ Unknown message type:', message.type);
        }
    }

    /**
     * Handle new message received
     */
    handleNewMessage(messageData) {
        console.log('[ChatWebSocket] New message received:', messageData);

        // Add message to UI if callback provided
        if (this.newMessageCallback) {
            this.newMessageCallback([messageData]);
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isWebSocketConnected() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatWebSocket;
}