// DOM Elements
const sidebar = document.getElementById('sidebar');
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const welcomeMessage = document.getElementById('welcomeMessage');
const historyList = document.getElementById('historyList');
const noHistory = document.getElementById('noHistory');
const translationSelect = document.getElementById('translationSelect');
const currentTranslation = document.getElementById('currentTranslation');

// Chat state
let currentChat = [];
let chatHistory = JSON.parse(localStorage.getItem('orabible_history')) || [];
let currentChatId = null;
let currentTranslationValue = 'ESV';

// Initialize
loadHistory();
createCrossPattern();
updateTranslationDisplay();

// Create cross decorative pattern
function createCrossPattern() {
    const pattern = document.createElement('div');
    pattern.className = 'cross-pattern';
    document.body.appendChild(pattern);
}

// Toggle sidebar
function toggleSidebar() {
    sidebar.classList.toggle('open');
}

// Auto-resize textarea
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

// Update translation
function updateTranslation() {
    currentTranslationValue = translationSelect.value;
    updateTranslationDisplay();
}

// Update translation display
function updateTranslationDisplay() {
    currentTranslation.textContent = `TRANSLATION: ${currentTranslationValue}`;
}

// Add message to chat
function addMessage(content, isUser = false) {
    // Hide welcome message on first message
    if (welcomeMessage.style.display !== 'none') {
        welcomeMessage.style.display = 'none';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format content - preserve line breaks
    contentDiv.innerHTML = content.replace(/\n/g, '<br>');
    
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Add to current chat
    currentChat.push({
        role: isUser ? 'user' : 'ai',
        content: content,
        timestamp: new Date().toLocaleTimeString(),
        translation: currentTranslationValue
    });
    
    // If this is the first user message, create new chat in history
    if (isUser && currentChat.length === 1) {
        saveToHistory(content);
    }
    
    // Update current chat in history
    updateCurrentChatInHistory();
}

// Save new chat to history
function saveToHistory(firstMessage) {
    const chatId = Date.now().toString();
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage;
    
    const newChat = {
        id: chatId,
        title: title,
        messages: [],
        timestamp: new Date().toISOString(),
        firstMessage: firstMessage,
        translation: currentTranslationValue
    };
    
    chatHistory.unshift(newChat);
    currentChatId = chatId;
    saveHistory();
    loadHistory();
}

// Update current chat in history
function updateCurrentChatInHistory() {
    if (!currentChatId) return;
    
    const chatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);
    if (chatIndex !== -1) {
        chatHistory[chatIndex].messages = [...currentChat];
        chatHistory[chatIndex].translation = currentTranslationValue;
        saveHistory();
    }
}

// Load chat from history
function loadChatFromHistory(chatId) {
    const chat = chatHistory.find(chat => chat.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    currentChat = [...chat.messages];
    currentTranslationValue = chat.translation || 'ESV';
    
    // Update translation select
    translationSelect.value = currentTranslationValue;
    updateTranslationDisplay();
    
    // Clear chat container
    chatContainer.innerHTML = '';
    welcomeMessage.style.display = 'none';
    
    // Add messages
    chat.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = msg.content.replace(/\n/g, '<br>');
        
        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Update active state in sidebar
    updateActiveChatInSidebar();
    
    // Close sidebar
    toggleSidebar();
}

// Update active chat in sidebar
function updateActiveChatInSidebar() {
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === currentChatId) {
            item.classList.add('active');
        }
    });
}

// Show typing indicator
function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }
    
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Remove typing indicator
function removeTyping() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Send message to Bible AI
async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;
    
    // Disable send button and clear input
    sendButton.disabled = true;
    const userMessage = content;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Add user message
    addMessage(userMessage, true);
    
    // Show typing indicator
    showTyping();
    
    try {
        // Bible AI API
        const url = `https://api.siputzx.my.id/api/ai/bibleai?question=${encodeURIComponent(userMessage)}&translation=${encodeURIComponent(currentTranslationValue)}`;
        
        console.log('Request URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response Structure:', data);
        
        // Remove typing indicator
        removeTyping();
        
        // Extract answer dari struktur response yang baru
        let aiResponse = extractBibleAnswer(data);
        
        // Jika tidak ada answer yang valid
        if (!aiResponse || aiResponse.trim().length < 10) {
            aiResponse = `ORABIBLE-AI (${currentTranslationValue} Translation)\n\nI apologize, but I couldn't retrieve a proper answer from the Bible AI service.\n\nPlease try rephrasing your question or try again later.`;
        }
        
        // Add AI response
        addMessage(aiResponse, false);
        
    } catch (error) {
        console.error('API Error:', error);
        removeTyping();
        addMessage(`ORABIBLE-AI (${currentTranslationValue} Translation)\n\nSorry, experiencing technical difficulties.\n\nError: ${error.message}\n\nPlease try again later or contact Oradev (@orasampurna).`, false);
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Function to extract answer from Bible AI response structure
function extractBibleAnswer(data) {
    console.log('Extracting answer from:', data);
    
    // Struktur berdasarkan response yang ditampilkan:
    // data.data.results.answer
    if (data.data && 
        data.data.results && 
        data.data.results.answer && 
        typeof data.data.results.answer === 'string') {
        console.log('Found answer in data.data.results.answer');
        return formatBibleAnswer(data.data.results.answer);
    }
    
    // Struktur alternatif: data.results.answer
    if (data.results && data.results.answer && typeof data.results.answer === 'string') {
        console.log('Found answer in data.results.answer');
        return formatBibleAnswer(data.results.answer);
    }
    
    // Struktur alternatif: data.answer langsung
    if (data.answer && typeof data.answer === 'string') {
        console.log('Found answer in data.answer');
        return formatBibleAnswer(data.answer);
    }
    
    // Struktur alternatif: data.data.answer
    if (data.data && data.data.answer && typeof data.data.answer === 'string') {
        console.log('Found answer in data.data.answer');
        return formatBibleAnswer(data.data.answer);
    }
    
    // Coba cari di struktur nested lainnya
    if (typeof data === 'object') {
        // Cari semua string panjang di object
        const findLongString = (obj, depth = 0) => {
            if (depth > 3) return null; // Batasi depth pencarian
            
            for (const key in obj) {
                if (typeof obj[key] === 'string' && obj[key].length > 50) {
                    console.log(`Found long string in ${key}:`, obj[key].substring(0, 100));
                    return formatBibleAnswer(obj[key]);
                }
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    const result = findLongString(obj[key], depth + 1);
                    if (result) return result;
                }
            }
            return null;
        };
        
        const foundAnswer = findLongString(data);
        if (foundAnswer) {
            return foundAnswer;
        }
    }
    
    console.log('No answer found in response structure');
    return null;
}

// Function to format Bible answer
function formatBibleAnswer(answer) {
    // Hapus citation brackets seperti [14], [22], dll
    let formatted = answer.replace(/\[\d+\]/g, '');
    
    // Hapus multiple citations seperti [4][6]
    formatted = formatted.replace(/\[\d+\]\[\d+\]/g, '');
    
    // Hapus citation ranges seperti [4-6]
    formatted = formatted.replace(/\[\d+\-\d+\]/g, '');
    
    // Bersihkan whitespace berlebihan
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    // Tambahkan header jika belum ada
    if (!formatted.includes('ORABIBLE-AI') && !formatted.toLowerCase().includes('answer:')) {
        formatted = `ORABIBLE-AI (${currentTranslationValue} Translation)\n\n${formatted}`;
    }
    
    return formatted;
}

// Load history from localStorage
function loadHistory() {
    historyList.innerHTML = '';
    
    if (chatHistory.length === 0) {
        noHistory.style.display = 'block';
        return;
    }
    
    noHistory.style.display = 'none';
    
    chatHistory.forEach(chat => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.id = chat.id;
        historyItem.textContent = chat.title;
        
        if (chat.id === currentChatId) {
            historyItem.classList.add('active');
        }
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'history-time';
        const translationText = chat.translation ? ` • ${chat.translation}` : '';
        timeDiv.textContent = new Date(chat.timestamp).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }) + translationText;
        
        historyItem.appendChild(timeDiv);
        historyItem.onclick = () => loadChatFromHistory(chat.id);
        historyList.appendChild(historyItem);
    });
}

// Save history to localStorage
function saveHistory() {
    localStorage.setItem('orabible_history', JSON.stringify(chatHistory));
}

// Clear all history
function clearAllHistory() {
    if (confirm("CLEAR ALL CHAT HISTORY?")) {
        chatHistory = [];
        currentChatId = null;
        currentChat = [];
        saveHistory();
        loadHistory();
        newChat();
        toggleSidebar();
    }
}

// Start new chat
function newChat() {
    if (currentChat.length > 0) {
        updateCurrentChatInHistory();
    }
    
    currentChat = [];
    currentChatId = null;
    chatContainer.innerHTML = '';
    welcomeMessage.style.display = 'block';
    chatContainer.appendChild(welcomeMessage);
    
    // Update active state in sidebar
    updateActiveChatInSidebar();
    
    toggleSidebar();
    messageInput.focus();
}

// Event Listeners
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-focus on load
window.addEventListener('load', () => {
    messageInput.focus();
});

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !e.target.classList.contains('menu-btn')) {
        toggleSidebar();
    }
});

// Export function for testing
window.testBibleAPI = async function(testQuestion, translation = 'ESV') {
    const url = `https://api.siputzx.my.id/api/ai/bibleai?question=${encodeURIComponent(testQuestion)}&translation=${encodeURIComponent(translation)}`;
    console.log('Testing URL:', url);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {'accept': '*/*'},
            mode: 'cors'
        });
        
        const data = await response.json();
        console.log('Full Test Response:', data);
        
        // Debug structure
        console.log('Response has data property:', !!data.data);
        if (data.data) {
            console.log('data.data structure:', data.data);
            console.log('data.data.results:', data.data.results);
            if (data.data.results) {
                console.log('data.data.results.answer:', data.data.results.answer ? data.data.results.answer.substring(0, 200) : 'No answer');
            }
        }
        
        return data;
    } catch (error) {
        console.error('Test Error:', error);
        return { error: error.message };
    }
};

// Function untuk men-debug struktur response
window.debugResponse = function(data) {
    console.group('Response Debug');
    console.log('Top level keys:', Object.keys(data));
    
    if (data.data) {
        console.log('data keys:', Object.keys(data.data));
        if (data.data.results) {
            console.log('results keys:', Object.keys(data.data.results));
            console.log('Answer exists:', !!data.data.results.answer);
            console.log('Answer type:', typeof data.data.results.answer);
            if (data.data.results.answer) {
                console.log('Answer preview:', data.data.results.answer.substring(0, 300));
            }
        }
    }
    
    console.groupEnd();
};
