import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDSU4RsY5zeQICARv6WUANKtgRoj17qhEo",
    authDomain: "edudb-4ce31.firebaseapp.com",
    projectId: "edudb-4ce31",
    storageBucket: "edudb-4ce31.appspot.com",
    messagingSenderId: "5542930290",
    appId: "1:5542930290:web:c038e21d164b6b60779feb",
    databaseURL: "https://edudb-4ce31-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const userListContainer = document.getElementById('user-list');
const chatContainer = document.getElementById('chat-container');
const searchBar = document.getElementById('search-bar');

// Store current user's ID
let currentUserId = null;

// Initialize listeners
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        loadUsers();
    } else {
        window.location.href = "signpage.html"; // Redirect if not logged in
    }
});

// Load and display user profiles
const loadUsers = () => {
    onValue(ref(db, 'users'), (snapshot) => {
        userListContainer.innerHTML = "";
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData.userId !== currentUserId) {
                const userElement = createUserElement(childSnapshot.key, userData);
                userListContainer.appendChild(userElement);
            }
        });
    });
};

// Create user element
const createUserElement = (userId, userData) => {
    const userElement = document.createElement('div');
    userElement.className = 'user-profile';
    userElement.innerHTML = `
        <img src="${userData.photoURL || 'img/default-avatar.png'}" alt="${userData.name}'s Profile Picture">
        <div class="user-info">
            <h3>${userData.name}</h3>
            <p>Followers: ${userData.followers ? Object.keys(userData.followers).length : 0}</p>
        </div>
        <button class="follow-btn ${userData.followers && userData.followers[currentUserId] ? 'following' : ''}" data-id="${userId}">${userData.followers && userData.followers[currentUserId] ? 'Unfollow' : 'Follow'}</button>
        <button class="message-btn" data-id="${userId}">Message</button>
    `;

    // Follow/Unfollow button
    userElement.querySelector('.follow-btn').addEventListener('click', () => toggleFollow(userId, userData));

    // Message button
    userElement.querySelector('.message-btn').addEventListener('click', () => openChat(userId, userData));

    return userElement;
};

// Toggle follow/unfollow
const toggleFollow = async (userId, userData) => {
    const userRef = ref(db, `users/${userId}/followers`);
    const currentUserRef = ref(db, `users/${currentUserId}/following`);

    if (userData.followers && userData.followers[currentUserId]) {
        // Unfollow
        await update(userRef, { [currentUserId]: null });
        await update(currentUserRef, { [userId]: null });
    } else {
        // Follow
        await update(userRef, { [currentUserId]: true });
        await update(currentUserRef, { [userId]: true });
    }
};

// Open chat with selected user
const openChat = (userId, userData) => {
    chatContainer.style.display = 'block';
    chatContainer.innerHTML = `
        <div class="chat-header">
            <h3>${userData.name}</h3>
            <span class="status">${userData.online ? 'Online' : 'Offline'}</span>
            <button class="block-btn" data-id="${userId}">${userData.blockedBy && userData.blockedBy[currentUserId] ? 'Unblock' : 'Block'}</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input">
            <textarea id="message-input" placeholder="Type a message..."></textarea>
            <button id="send-message-btn">Send</button>
        </div>
    `;

    loadMessages(userId);
    setupChatListeners(userId, userData);
};

// Load chat messages
const loadMessages = (userId) => {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatRef = ref(db, `chats/${currentUserId}_${userId}`);

    onValue(chatRef, (snapshot) => {
        chatMessagesContainer.innerHTML = "";
        snapshot.forEach((childSnapshot) => {
            const messageData = childSnapshot.val();
            const messageElement = createMessageElement(messageData);
            chatMessagesContainer.appendChild(messageElement);
        });
    });
};

// Create chat message element
const createMessageElement = (messageData) => {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageData.senderId === currentUserId ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <p>${messageData.content}</p>
        <span class="time">${new Date(messageData.timestamp).toLocaleString()}</span>
    `;
    return messageElement;
};

// Setup chat listeners and functionalities
const setupChatListeners = (userId, userData) => {
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const blockBtn = document.querySelector('.block-btn');

    // Send message
    sendMessageBtn.addEventListener('click', async () => {
        const content = messageInput.value.trim();
        if (content === "") return;

        const chatRef = ref(db, `chats/${currentUserId}_${userId}`);
        const newMessage = {
            content,
            senderId: currentUserId,
            timestamp: new Date().toISOString()
        };

        await push(chatRef, newMessage);
        messageInput.value = ""; // Clear input
    });

    // Block/Unblock user
    blockBtn.addEventListener('click', async () => {
        const isBlocked = userData.blockedBy && userData.blockedBy[currentUserId];
        const userRef = ref(db, `users/${userId}/blockedBy`);
        await update(userRef, { [currentUserId]: isBlocked ? null : true });
        blockBtn.textContent = isBlocked ? 'Block' : 'Unblock';
    });
};

// Search users
searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const userProfiles = document.querySelectorAll('.user-profile');
    userProfiles.forEach(profile => {
        const userName = profile.querySelector('.user-info h3').textContent.toLowerCase();
        profile.style.display = userName.includes(searchTerm) ? 'flex' : 'none';
    });
});
