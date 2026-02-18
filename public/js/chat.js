class PremiumChat {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api/chat';  // Use relative URL, not localhost
        this.messageHistory = [];
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadTheme();
        this.setupAutoResize();
    }

    cacheDOM() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.historyList = document.getElementById('historyList');
    }

    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.newChatBtn.addEventListener('click', () => this.newChat());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.removeWelcomeMessage();
        this.addMessage(message, 'user');
        
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        
        this.showTypingIndicator();
        this.sendBtn.disabled = true;

        try {
            const response = await this.getAIResponse(message);
            this.hideTypingIndicator();
            
            if (response && response.response) {
                this.addMessage(response.response, 'ai');
            } else if (typeof response === 'string') {
                this.addMessage(response, 'ai');
            } else {
                this.addMessage('Received unexpected response format', 'ai error');
            }
            
            this.saveToHistory(message, response.response || response);
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Chat error:', error);
            this.addMessage('Sorry, I encountered an error. Please check the console for details.', 'ai error');
        } finally {
            this.sendBtn.disabled = false;
        }
    }

    async getAIResponse(message) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (type === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content-wrapper">
                    <div class="message-content">${this.formatMessage(content)}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content-wrapper">
                    <div class="message-content">${this.formatMessage(content)}</div>
                    <div class="message-time" style="text-align: right;">${time}</div>
                </div>
            `;
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Apply syntax highlighting to code blocks
        if (window.hljs) {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }

    formatMessage(text) {
        if (!text) return '';
        
        // Escape HTML
        text = this.escapeHtml(text);
        
        // Detect and format code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        text = text.replace(codeBlockRegex, (match, language, code) => {
            const lang = language || 'plaintext';
            return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
        });
        
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" style="color: #667eea;">$1</a>');
        
        // Convert line breaks to <br> (but not inside code blocks)
        const lines = text.split('\n');
        let inCodeBlock = false;
        let formattedText = '';
        
        for (let line of lines) {
            if (line.includes('<pre>')) {
                inCodeBlock = true;
                formattedText += line + '\n';
            } else if (line.includes('</pre>')) {
                inCodeBlock = false;
                formattedText += line + '\n';
            } else if (!inCodeBlock) {
                formattedText += line + '<br>';
            } else {
                formattedText += line + '\n';
            }
        }
        
        return formattedText;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    removeWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    }

    showTypingIndicator() {
        this.typingIndicator.classList.add('active');
        this.typingIndicator.textContent = 'AI is typing';
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.remove('active');
        this.typingIndicator.textContent = '';
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    newChat() {
        this.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-sparkles"></i>
                </div>
                <h1>How can I help you today?</h1>
                <p>Ask me anything, I'm here to assist you</p>
            </div>
        `;
        this.messageHistory = [];
        this.updateHistoryUI();
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = this.themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const icon = this.themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    saveToHistory(userMessage, aiResponse) {
        const historyItem = {
            id: Date.now(),
            userMessage: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
            timestamp: new Date().toLocaleString()
        };
        
        this.messageHistory.unshift(historyItem);
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        if (this.messageHistory.length === 0) {
            this.historyList.innerHTML = '<div class="history-item" style="opacity:0.5;">No chats yet</div>';
            return;
        }
        
        this.historyList.innerHTML = this.messageHistory.slice(0, 10).map(item => `
            <div class="history-item" data-id="${item.id}">
                <i class="fas fa-message"></i>
                <span>${item.userMessage}</span>
            </div>
        `).join('');
    }
}

// Initialize the chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PremiumChat();
});