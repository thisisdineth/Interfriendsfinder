import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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
const tweetContainer = document.getElementById('tweet-container');
const replyForm = document.getElementById('new-reply');
const postReplyBtn = document.getElementById('post-reply-btn');
const repliesContainer = document.getElementById('replies-container');

// Get tweet ID from URL
const urlParams = new URLSearchParams(window.location.search);
const tweetId = urlParams.get('id');

// Load the tweet
onAuthStateChanged(auth, (user) => {
    if (user) {
        const tweetRef = ref(db, `tweets/${tweetId}`);
        onValue(tweetRef, (snapshot) => {
            const tweetData = snapshot.val();
            if (tweetData) {
                tweetContainer.innerHTML = `
                    <p>${tweetData.content}</p>
                    <small>Posted by ${tweetData.author} on ${new Date(tweetData.timestamp).toLocaleString()}</small>
                `;
            }
        });

        // Load replies
        const repliesRef = ref(db, `replies/${tweetId}`);
        onValue(repliesRef, (snapshot) => {
            repliesContainer.innerHTML = "";  // Clear previous replies
            snapshot.forEach((childSnapshot) => {
                const replyData = childSnapshot.val();
                const replyElement = document.createElement('div');
                replyElement.className = 'reply';
                replyElement.innerHTML = `
                    <p>${replyData.content}</p>
                    <small>Posted by ${replyData.author} on ${new Date(replyData.timestamp).toLocaleString()}</small>
                `;
                repliesContainer.appendChild(replyElement);
            });
        });

        // Post a new reply
        postReplyBtn.addEventListener('click', async () => {
            const replyContent = replyForm.value.trim();
            if (replyContent === "") return;  // Prevent posting empty replies

            const replyRef = ref(db, `replies/${tweetId}`);
            const newReply = {
                content: replyContent,
                author: user.displayName,
                userId: user.uid,
                timestamp: new Date().toISOString()
            };

            await push(replyRef, newReply);  // Push the new reply to the database
            replyForm.value = "";  // Clear the input field after posting
        });
    } else {
        window.location.href = "signpage.html";  // Redirect to sign-in page if not logged in
    }
});
