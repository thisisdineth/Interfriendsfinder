import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, get, push, onValue, remove, serverTimestamp, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { filterBadWords } from './badword.js';  // Import the bad words filtering function

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBTonYWFHgcxcVi1BBVeZkx823CfuT7CgM",
    authDomain: "findaguest-3024b.firebaseapp.com",
    databaseURL: "https://findaguest-3024b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "findaguest-3024b",
    storageBucket: "findaguest-3024b.appspot.com",
    messagingSenderId: "292838904473",
    appId: "1:292838904473:web:65cc9227374cb898581e08",
    measurementId: "G-WPJK68Y0XZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentChatRoom = null;
let typingRef = null;
let replyMessageId = null;
let inactivityTimeout = null;
let chatLeaveTimeout = null;

// Sign in anonymously
signInAnonymously(auth).catch((error) => {
    console.error("Error signing in anonymously:", error);
});

// Show loading screen for 1 seconds
window.addEventListener('load', function() {
    setTimeout(function() {
        document.body.classList.add('loaded');
    }, 1000); // 5 seconds delay
});

// Handle authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        setActiveUser();
        updateActiveUsersCount();

        // Listen for existing chat room
        const userChatRoomRef = ref(db, `users/${currentUser.uid}/currentChatRoom`);
        onValue(userChatRoomRef, (snapshot) => {
            if (snapshot.exists()) {
                currentChatRoom = snapshot.val();
                redirectToChatRoom();
                listenForMessages();
                listenForTyping();
                resetInactivityTimer();
            }
        });
    }
});

// Update active users count
function updateActiveUsersCount() {
    const activeUsersRef = ref(db, 'activeUsers');
    onValue(activeUsersRef, (snapshot) => {
        const activeUsers = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        document.getElementById('active-user-count').textContent = activeUsers;
    });
}

// Add current user to active users
function setActiveUser() {
    const userRef = ref(db, `activeUsers/${currentUser.uid}`);
    set(userRef, {
        uid: currentUser.uid,
        timestamp: serverTimestamp()
    });

    onDisconnect(userRef).remove().then(() => {
        console.log("User disconnected.");
        updateActiveUsersCount();
    });

    // Listen for visibility change to detect inactivity
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Handle visibility change to detect inactivity
function handleVisibilityChange() {
    if (document.hidden) {
        // User is inactive (in another tab or minimized)
        markUserInactive();
    } else {
        // User is active again
        markUserActive();
    }
}

// Mark the user as inactive
function markUserInactive() {
    const userRef = ref(db, `activeUsers/${currentUser.uid}`);
    remove(userRef).then(() => {
        console.log("User marked as inactive.");
        clearTimeout(inactivityTimeout);
        clearTimeout(chatLeaveTimeout);
    });
}

// Mark the user as active
function markUserActive() {
    setActiveUser();
    resetInactivityTimer();
}

// Reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(chatLeaveTimeout);
    chatLeaveTimeout = setTimeout(leaveChatRoom, 120000); // 2 minutes inactivity
}

// Start a chat with a random user
async function startChat() {
    try {
        const activeUsersRef = ref(db, 'activeUsers');
        const snapshot = await get(activeUsersRef);

        if (snapshot.exists()) {
            const activeUsers = snapshot.val();
            const userIds = Object.keys(activeUsers).filter(uid => uid !== currentUser.uid);

            if (userIds.length > 0) { // Minimum of 1 active users required
                const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
                await connectToChatRoom(randomUserId);
            } else {
                alert("At least two users need to be online to start a chat. Please wait...");
            }
        } else {
            alert("No active users available.");
        }
    } catch (error) {
        console.error("Error starting chat:", error);
    }
}

// Connect to a chat room or create one if it doesn't exist
async function connectToChatRoom(partnerUid) {
    if (partnerUid === currentUser.uid) {
        console.error("Cannot connect to a chat room with yourself.");
        return;
    }

    const chatRoomsRef = ref(db, 'chatRooms');
    const userChatRoomRef = ref(db, `users/${currentUser.uid}/currentChatRoom`);
    const partnerChatRoomRef = ref(db, `users/${partnerUid}/currentChatRoom`);

    // Check if a chat room already exists between the two users
    let existingChatRoom = null;
    const existingChatRoomsSnapshot = await get(chatRoomsRef);
    if (existingChatRoomsSnapshot.exists()) {
        existingChatRoomsSnapshot.forEach(roomSnapshot => {
            const roomData = roomSnapshot.val();
            if (roomData.users && roomData.users.includes(currentUser.uid) && roomData.users.includes(partnerUid)) {
                existingChatRoom = roomSnapshot.key;
            }
        });
    }

    if (existingChatRoom) {
        currentChatRoom = existingChatRoom;
        await set(userChatRoomRef, currentChatRoom);
        await set(partnerChatRoomRef, currentChatRoom);
    } else {
        const newChatRoomRef = push(chatRoomsRef);
        currentChatRoom = newChatRoomRef.key;
        await set(newChatRoomRef, {
            users: [currentUser.uid, partnerUid],
            messages: []
        });
        await set(userChatRoomRef, currentChatRoom);
        await set(partnerChatRoomRef, currentChatRoom);
    }

    console.log(`Connected to chat room with ID: ${currentChatRoom}`);
    redirectToChatRoom();
    listenForMessages();
    listenForTyping();
    resetInactivityTimer();
}

// Redirect user to the chat room
function redirectToChatRoom() {
    alert("Successfully connected to a user! You can now start chatting.");
    document.getElementById('chat-container').style.display = 'block';
}

// Listen for messages in the chat room
function listenForMessages() {
    if (!currentChatRoom) return;
    const chatMessagesRef = ref(db, `chatRooms/${currentChatRoom}/messages`);
    onValue(chatMessagesRef, (snapshot) => {
        const chatBox = document.getElementById('chat-box');
        
        chatBox.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const messageData = childSnapshot.val();
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            if (messageData.uid === currentUser.uid) {
                messageElement.classList.add('you');
            } else {
                messageElement.classList.add('stranger');
            }

            // Add the message text with bad word filtering and math formatting
            const messageText = document.createElement('div');
            messageText.classList.add('message-text');
            messageText.innerHTML = filterBadWords(formatMathExpression(messageData.message));  // Use the new filter function
            messageElement.appendChild(messageText);

            // Show reply if exists
            if (messageData.replyTo) {
                const replyElement = document.createElement('div');
                replyElement.classList.add('reply');
                replyElement.innerHTML = `Replying to: ${filterBadWords(formatMathExpression(messageData.replyTo.message))}`;  // Use the new filter function
                messageElement.appendChild(replyElement);
            }

            // Add delete button for own messages
            if (messageData.uid === currentUser.uid) {
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-btn', 'hidden');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => deleteMessage(childSnapshot.key));
                messageElement.appendChild(deleteButton);
            }

            // Add reply button for all messages
            const replyButton = document.createElement('button');
            replyButton.classList.add('reply-btn', 'hidden');
            replyButton.textContent = 'Reply';
            replyButton.addEventListener('click', () => setReplyTo(filterBadWords(formatMathExpression(messageData.message))));  // Use the new filter function
            messageElement.appendChild(replyButton);

            // Show buttons on hover or click
            messageElement.addEventListener('mouseenter', () => {
                showButtons(messageElement);
            });
            messageElement.addEventListener('mouseleave', () => {
                hideButtons(messageElement);
            });
            messageElement.addEventListener('click', () => {
                toggleButtons(messageElement);
            });

            chatBox.appendChild(messageElement);
        });

        // Always scroll to the bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// Show buttons for the message element
function showButtons(messageElement) {
    const buttons = messageElement.querySelectorAll('.delete-btn, .reply-btn');
    buttons.forEach(button => button.classList.remove('hidden'));
}

// Hide buttons for the message element
function hideButtons(messageElement) {
    const buttons = messageElement.querySelectorAll('.delete-btn, .reply-btn');
    buttons.forEach(button => button.classList.add('hidden'));
}

// Toggle buttons visibility on click
function toggleButtons(messageElement) {
    const buttons = messageElement.querySelectorAll('.delete-btn, .reply-btn');
    buttons.forEach(button => button.classList.toggle('hidden'));
}

// Set the message to reply to
function setReplyTo(message) {
    replyMessageId = message;
    const chatInput = document.getElementById('chat-input');
    chatInput.placeholder = `Replying to: ${message}`;
}

// Handle typing event
function handleTyping() {
    if (typingRef) {
        set(typingRef, {
            uid: currentUser.uid,
            timestamp: serverTimestamp()
        });
    }
    resetInactivityTimer(); // Reset the inactivity timer on typing
}

// Listen for typing status
function listenForTyping() {
    if (!currentChatRoom) return;
    typingRef = ref(db, `chatRooms/${currentChatRoom}/typing`);
    onValue(typingRef, (snapshot) => {
        const typingData = snapshot.val();
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingData && typingData.uid !== currentUser.uid) {
            typingIndicator.textContent = "Stranger is typing...";
        } else {
            typingIndicator.textContent = "";
        }
    });
}

// Send a message in the chat room
function sendMessage() {
    const chatInput = document.getElementById('chat-input').value;
    if (chatInput.trim() === '') return;

    try {
        const chatMessagesRef = ref(db, `chatRooms/${currentChatRoom}/messages`);
        const newMessageRef = push(chatMessagesRef);

        set(newMessageRef, {
            uid: currentUser.uid,
            message: filterBadWords(formatMathExpression(chatInput)),  // Use the new filter function
            replyTo: replyMessageId ? { message: replyMessageId } : null,
            timestamp: serverTimestamp()
        }).then(() => {
            console.log("Message sent.");
            document.getElementById('chat-input').value = '';
            document.getElementById('chat-input').placeholder = 'You: Type a message...'; // Reset placeholder
            replyMessageId = null; // Reset reply
            handleTyping(); // Reset typing status

            // Always scroll to the bottom after sending a message
            const chatBox = document.getElementById('chat-box');
            chatBox.scrollTop = chatBox.scrollHeight;
        }).catch((error) => {
            console.error("Error sending message:", error);
        });
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// Delete a message
function deleteMessage(messageId) {
    const messageRef = ref(db, `chatRooms/${currentChatRoom}/messages/${messageId}`);
    remove(messageRef)
        .then(() => {
            console.log("Message deleted.");
        })
        .catch((error) => {
            console.error("Error deleting message:", error);
        });
}

// Leave the chat room and notify the other user
async function leaveChatRoom() {
    if (currentChatRoom) {
        const chatRoomRef = ref(db, `chatRooms/${currentChatRoom}`);
        
        // Send a message indicating the user has left the chat
        const skipMessageRef = push(ref(db, `chatRooms/${currentChatRoom}/messages`));
        await set(skipMessageRef, {
            uid: currentUser.uid,
            message: "The user has left the chat.",
            isSystemMessage: true,  // Mark this as a system message
            timestamp: serverTimestamp()
        });

        // Allow some time for the message to be sent before clearing the chat
        setTimeout(async () => {
            await remove(chatRoomRef);
            currentChatRoom = null;
            document.getElementById('chat-box').innerHTML = '';
            document.getElementById('chat-container').style.display = 'none';
            alert("You have left the chat.");
        }, 500);
    }
}

// Bad word filter is now handled by badword.js

// Format math expressions into a readable format
function formatMathExpression(input) {
    // Convert exponents
    input = input.replace(/\^(\d+)/g, (_, exp) => `<sup>${exp}</sup>`);

    // Convert multiplication symbols
    input = input.replace(/\*/g, '×');

    // Convert division symbols
    input = input.replace(/\//g, '÷');

    // Additional formatting can be added here
    return input;
}

// Event Listeners
document.getElementById('new-chat-btn').addEventListener('click', startChat);
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('skip-btn').addEventListener('click', leaveChatRoom);
document.getElementById('chat-input').addEventListener('input', handleTyping);
document.getElementById('chat-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// Update the local time periodically
setInterval(() => {
    const localTime = new Date().toLocaleTimeString();
    document.getElementById('local-time').textContent = localTime;
}, 1000);
