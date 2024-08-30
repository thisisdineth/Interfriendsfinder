import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, get, push, onValue, remove, serverTimestamp, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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
let audioBlob = null;
let mediaRecorder = null;
let audioURL = null;
let audioContext;

// Sign in anonymously
signInAnonymously(auth).catch((error) => {
    console.error("Error signing in anonymously:", error);
});

// Handle authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        setActiveUser();
        updateActiveUsersCount();
        listenForChatRoomChanges();
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

    onDisconnect(userRef).remove();

    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Handle visibility change to detect inactivity
function handleVisibilityChange() {
    if (document.hidden) {
        markUserInactive();
    } else {
        markUserActive();
    }
}

// Mark the user as inactive
function markUserInactive() {
    const userRef = ref(db, `activeUsers/${currentUser.uid}`);
    remove(userRef);
}

// Mark the user as active
function markUserActive() {
    setActiveUser();
}

// Start a chat with a random user
async function startChat() {
    try {
        const activeUsersRef = ref(db, 'activeUsers');
        const snapshot = await get(activeUsersRef);

        if (snapshot.exists()) {
            const activeUsers = snapshot.val();
            const userIds = Object.keys(activeUsers).filter(uid => uid !== currentUser.uid);

            if (userIds.length > 0) {
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

// Listen for chat room changes
function listenForChatRoomChanges() {
    const userChatRoomRef = ref(db, `users/${currentUser.uid}/currentChatRoom`);
    onValue(userChatRoomRef, (snapshot) => {
        if (snapshot.exists()) {
            currentChatRoom = snapshot.val();
            redirectToChatRoom();
            listenForMessages();
            listenForUserDisconnection();
            showNotification("A user has connected to your chat.");
        }
    });
}

// Connect to a chat room or create one if it doesn't exist
async function connectToChatRoom(partnerUid) {
    const chatRoomsRef = ref(db, 'chatRooms');
    const userChatRoomRef = ref(db, `users/${currentUser.uid}/currentChatRoom`);
    const partnerChatRoomRef = ref(db, `users/${partnerUid}/currentChatRoom`);

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

    redirectToChatRoom();
    listenForMessages();
    listenForUserDisconnection();
    showNotification("A user has connected to your chat.");
}

// Redirect user to the chat room
function redirectToChatRoom() {
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

            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.src = messageData.audioURL;

            // Safari fallback and fix pitch issues
            audioElement.onerror = async () => {
                try {
                    const url = await convertToSupportedFormat(messageData.audioBase64);
                    if (url) {
                        audioElement.src = url;
                        audioElement.load();
                    }
                } catch (error) {
                    console.error("Error converting or playing audio:", error);
                }
            };

            audioElement.onplay = () => {
                // Ensure normal playback speed to avoid "chipmunk" effect
                audioElement.playbackRate = 1.0;
            };

            messageElement.appendChild(audioElement);

            if (messageData.uid === currentUser.uid) {
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-btn', 'hidden');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => deleteMessage(childSnapshot.key));
                messageElement.appendChild(deleteButton);
            }

            messageElement.addEventListener('mouseenter', () => {
                const deleteBtn = messageElement.querySelector('.delete-btn');
                if (deleteBtn) deleteBtn.classList.remove('hidden');
            });

            messageElement.addEventListener('mouseleave', () => {
                const deleteBtn = messageElement.querySelector('.delete-btn');
                if (deleteBtn) deleteBtn.classList.add('hidden');
            });

            chatBox.appendChild(messageElement);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// Listen for user disconnection
function listenForUserDisconnection() {
    const chatRoomRef = ref(db, `chatRooms/${currentChatRoom}`);
    onValue(chatRoomRef, (snapshot) => {
        if (!snapshot.exists()) {
            showNotification("The other user has left the chat.");
            document.getElementById('chat-container').style.display = 'none';
        }
    });
}

// Record voice message
async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support recording.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        const chunks = [];
        mediaRecorder.ondataavailable = (event) => {
            chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(chunks, { type: 'audio/webm' });
            audioURL = URL.createObjectURL(audioBlob);
            document.getElementById('audio-playback').src = audioURL;
            toggleButtons(true);  // Enable play, send, and cancel buttons
        };

        mediaRecorder.start();
        document.getElementById('record-btn').textContent = 'Recording...';
        document.getElementById('record-btn').disabled = true;
        document.getElementById('cancel-btn').disabled = false;  // Enable cancel button during recording
    } catch (error) {
        console.error('Error starting recording:', error);
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        document.getElementById('record-btn').textContent = 'Record';
        document.getElementById('record-btn').disabled = false;
    }
}

// Send the recorded message
function sendMessage() {
    if (!audioBlob) return;

    const chatMessagesRef = ref(db, `chatRooms/${currentChatRoom}/messages`);
    const newMessageRef = push(chatMessagesRef);

    const reader = new FileReader();
    reader.onload = async function () {
        const audioBase64 = reader.result.split(',')[1];

        await set(newMessageRef, {
            uid: currentUser.uid,
            audioBase64: audioBase64,
            audioURL: audioURL,
            timestamp: serverTimestamp()
        });

        resetRecordingState();  // Reset the recording state
    };

    reader.readAsDataURL(audioBlob);
}

// Cancel the recording
function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();  // Stop recording
    }
    resetRecordingState();
}

// Reset the recording state
function resetRecordingState() {
    audioBlob = null;
    audioURL = null;
    document.getElementById('audio-playback').src = '';
    toggleButtons(false);  // Disable play, send, and cancel buttons
    document.getElementById('record-btn').textContent = 'Record';
    document.getElementById('record-btn').disabled = false;
}

// Delete a message
function deleteMessage(messageId) {
    const messageRef = ref(db, `chatRooms/${currentChatRoom}/messages/${messageId}`);
    remove(messageRef).catch((error) => {
        console.error("Error deleting message:", error);
    });
}

// Toggle buttons state
function toggleButtons(enable) {
    document.getElementById('play-btn').disabled = !enable;
    document.getElementById('send-btn').disabled = !enable;
    document.getElementById('cancel-btn').disabled = !enable;
}

// Show notification
function showNotification(message) {
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('notification');
    notificationElement.textContent = message;
    document.body.appendChild(notificationElement);

    setTimeout(() => {
        notificationElement.remove();
    }, 3000);
}

// Convert audio data to a Safari-compatible format
async function convertToSupportedFormat(base64Data) {
    if (!base64Data) {
        console.error("No audio data to convert.");
        return null;
    }

    try {
        const response = await fetch(`data:audio/webm;base64,${base64Data}`);
        const blob = await response.blob();

        // Ensure AudioContext is started after user gesture
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        await audioContext.resume(); // Resume AudioContext after a user gesture

        // Convert Blob to WAV/MP4
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const wavBuffer = audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        return URL.createObjectURL(wavBlob);
    } catch (error) {
        console.error("Error converting audio data:", error);
        return null;
    }
}

// Leave the chat room and notify the other user
async function leaveChatRoom() {
    if (currentChatRoom) {
        const chatRoomRef = ref(db, `chatRooms/${currentChatRoom}`);

        const leaveMessageRef = push(ref(db, `chatRooms/${currentChatRoom}/messages`));
        await set(leaveMessageRef, {
            uid: currentUser.uid,
            message: "The user has left the chat.",
            isSystemMessage: true,
            timestamp: serverTimestamp()
        });

        setTimeout(async () => {
            await remove(chatRoomRef);
            currentChatRoom = null;
            document.getElementById('chat-box').innerHTML = '';
            document.getElementById('chat-container').style.display = 'none';
            alert("You have left the chat.");
        }, 500);
    }
}

// Convert audio buffer to WAV
function audioBufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArray = new ArrayBuffer(length),
        view = new DataView(bufferArray),
        channels = [],
        sampleRate = buffer.sampleRate,
        offset = 0;

    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // File length
    setUint32(0x45564157); // "WAVE"

    // Sub-chunk "fmt "
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // Sub-chunk size
    setUint16(1); // PCM format
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // Byte rate
    setUint16(numOfChan * 2); // Block align
    setUint16(16); // Bits per sample

    // Sub-chunk "data"
    setUint32(0x61746164); // "data"
    setUint32(length - offset - 4); // Sub-chunk size

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (offset < length) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 32768 : sample * 32767;
            view.setInt16(offset, sample, true);
            offset += 2;
        }
    }

    return bufferArray;

    function setUint16(data) {
        view.setUint16(offset, data, true);
        offset += 2;
    }

    function setUint32(data) {
        view.setUint32(offset, data, true);
        offset += 4;
    }
}

// Event listeners
document.getElementById('record-btn').addEventListener('click', () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioContext.resume().then(() => {
        startRecording();
    });
});
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('cancel-btn').addEventListener('click', cancelRecording);
document.getElementById('new-chat-btn').addEventListener('click', startChat);
document.getElementById('skip-btn').addEventListener('click', leaveChatRoom);
document.getElementById('play-btn').addEventListener('click', stopRecording);

setInterval(() => {
    document.getElementById('local-time').textContent = new Date().toLocaleTimeString();
}, 1000);
