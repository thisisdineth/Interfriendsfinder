import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, remove, get, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentVideoRoom = null;
let localStream = null;
let peerConnection = null;
let partnerUid = null;
let videoEnabled = true;

// STUN and TURN servers
const servers = {
    iceServers: [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
            urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
            username: 'webrtc',
            credential: 'webrtc'
        }
    ],
};

// Sign in anonymously
signInAnonymously(auth).catch((error) => {
    console.error("Error signing in anonymously:", error);
});

// Handle authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log("User signed in:", user.uid);
        setActiveUser();
        updateLocalTime();
        setInterval(updateLocalTime, 1000); // Update time every second
    }
});

// Set active user and watch for available partners
function setActiveUser() {
    const activeUsersRef = ref(db, `videoActiveUsers/${currentUser.uid}`);
    set(activeUsersRef, {
        uid: currentUser.uid,
        timestamp: new Date().toISOString()
    });

    onValue(ref(db, 'videoActiveUsers'), (snapshot) => {
        const activeUsers = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        document.getElementById('active-user-count').textContent = activeUsers;
    });

    onDisconnect(activeUsersRef).remove();
}

// Update local time display
function updateLocalTime() {
    const now = new Date();
    document.getElementById('local-time').textContent = now.toLocaleTimeString();
}

// Start local stream and setup WebRTC
async function startLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        document.getElementById('find-new-user-btn').disabled = false;
        document.getElementById('toggle-video-btn').disabled = false;
    } catch (error) {
        console.error("Error accessing media devices.", error);
    }
}

// Connect to a new video room with a random partner
async function findNewGuest() {
    showLoading(true);  // Show loading when searching for a partner

    if (peerConnection) {
        endVideoChat();
    }

    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.ontrack = handleTrackEvent;

    const activeUsersRef = ref(db, 'videoActiveUsers');
    const activeUsersSnapshot = await get(activeUsersRef);
    const activeUsers = activeUsersSnapshot.exists() ? Object.keys(activeUsersSnapshot.val()).filter(uid => uid !== currentUser.uid) : [];
    
    if (activeUsers.length > 0) {
        partnerUid = activeUsers[Math.floor(Math.random() * activeUsers.length)];
        const videoRoomsRef = ref(db, 'videoRooms');
        const newVideoRoomRef = push(videoRoomsRef);
        currentVideoRoom = newVideoRoomRef.key;

        await set(newVideoRoomRef, {
            users: [currentUser.uid, partnerUid],
        });

        setupWebRTC(newVideoRoomRef);
        startLocalStream();

        document.getElementById('leave-chat-btn').disabled = false;
        document.getElementById('find-new-user-btn').disabled = true;
    } else {
        alert("No other active users found. Please try again later.");
        showLoading(false);  // Hide loading if no users are found
    }
}

// Setup WebRTC and handle offer/answer exchange
async function setupWebRTC(roomRef) {
    const roomSnapshot = await get(roomRef);

    if (roomSnapshot.exists()) {
        const roomData = roomSnapshot.val();
        if (roomData.offer) {
            console.log("Setting remote description with received offer.");
            await peerConnection.setRemoteDescription(new RTCSessionDescription(roomData.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log("Sending answer.");
            await set(ref(db, `${roomRef.key}/answer`), answer);
        } else {
            console.log("Creating offer.");
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log("Sending offer.");
            await set(ref(db, `${roomRef.key}/offer`), offer);
        }
    }

    onValue(ref(db, `${roomRef.key}/answer`), async (snapshot) => {
        if (snapshot.exists() && !peerConnection.currentRemoteDescription) {
            console.log("Setting remote description with received answer.");
            const answer = snapshot.val();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    });

    onValue(ref(db, `${roomRef.key}/iceCandidates`), (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach(async (iceSnapshot) => {
                if (iceSnapshot.val()) {
                    try {
                        console.log("Adding ICE candidate.");
                        await peerConnection.addIceCandidate(new RTCIceCandidate(iceSnapshot.val()));
                    } catch (e) {
                        console.error("Error adding received ice candidate", e);
                    }
                }
            });
        }
    });
}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        console.log("Sending ICE candidate.");
        const roomRef = ref(db, `videoRooms/${currentVideoRoom}/iceCandidates`);
        set(push(roomRef), event.candidate);
    }
}

function handleTrackEvent(event) {
    console.log("Received remote track.");
    const remoteVideo = document.getElementById('remote-video');
    remoteVideo.srcObject = event.streams[0];
    showLoading(false);  // Hide loading and show video once connected
    document.getElementById('status').textContent = "Stranger successfully connected!";
}

// End the video chat and stop the local stream
function endVideoChat() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    currentVideoRoom = null;
    partnerUid = null;
    document.getElementById('remote-video').srcObject = null;
    document.getElementById('local-video').srcObject = null;
    document.getElementById('leave-chat-btn').disabled = true;
    document.getElementById('find-new-user-btn').disabled = false;
    document.getElementById('status').textContent = "";
}

// Toggle video on/off
function toggleVideo() {
    if (localStream) {
        videoEnabled = !videoEnabled;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = videoEnabled;
        });

        const toggleButton = document.getElementById('toggle-video-btn');
        toggleButton.textContent = videoEnabled ? 'Turn Off Video' : 'Turn On Video';
    }
}

// Show or hide the loading container
function showLoading(show) {
    const loadingContainer = document.getElementById('loading-container');
    loadingContainer.style.display = show ? 'flex' : 'none';
}

// Event listeners
document.getElementById('find-new-user-btn').addEventListener('click', findNewGuest);
document.getElementById('leave-chat-btn').addEventListener('click', endVideoChat);
document.getElementById('toggle-video-btn').addEventListener('click', toggleVideo);

// Start the local stream on page load
startLocalStream();
