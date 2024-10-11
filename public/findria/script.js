document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const userInput = document.getElementById('user-input').value.trim();
    if (userInput === "") return;

    // Append user's message to the chat
    appendMessage(userInput, 'user');

    // Clear the input
    document.getElementById('user-input').value = "";

    // Call Gemini AI API with the user's input
    getBotResponse(userInput);
}

function appendMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender);
    messageDiv.innerText = message;
    chatBox.appendChild(messageDiv);

    // Scroll to the latest message
    chatBox.scrollTop = chatBox.scrollHeight;
}

function getBotResponse(userInput) {
    const apiKey = 'AIzaSyDGqCH0lB5qZjs8tSxveNzU0fhE570N3jM';  // Replace with your Gemini AI API Key
    const apiEndpoint = 'https://gemini.google.com/chat';  // Ensure this is the correct endpoint

    fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            message: userInput,
            userId: 'user123',  // You can modify this to track individual user sessions
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const botMessage = data.response || "Sorry, I didn't understand that.";
        appendMessage(botMessage, 'bot');
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage("Error connecting to Gemini AI. Please check your network or try again later.", 'bot');
    });
}
