import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDSU4RsY5zeQICARv6WUANKtgRoj17qhEo",
    authDomain: "edudb-4ce31.firebaseapp.com",
    projectId: "edudb-4ce31",
    storageBucket: "edudb-4ce31.appspot.com",
    messagingSenderId: "5542930290",
    appId: "1:5542930290:web:c038e21d164b6b60779feb",
    databaseURL: "https://edudb-4ce31-default-rtdb.asia-southeast1.firebasedatabase.app/"  // DB region-specific URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const tweetForm = document.getElementById('new-tweet');
const postTweetBtn = document.getElementById('post-tweet-btn');
const tweetsContainer = document.getElementById('tweets-container');
const signoutBtn = document.getElementById('signout-btn');

// Post a new tweet
postTweetBtn.addEventListener('click', async () => {
    const tweetContent = tweetForm.value.trim();
    if (tweetContent === "") return;  // Prevent posting empty tweets

    const user = auth.currentUser;

    if (user) {
        const tweetRef = ref(db, 'tweets/');
        const newTweet = {
            content: tweetContent,
            author: user.displayName,
            userId: user.uid,
            timestamp: new Date().toISOString()
        };

        await push(tweetRef, newTweet);  // Push the new tweet to the database
        tweetForm.value = "";  // Clear the input field after posting
    } else {
        alert("You must be logged in to post a tweet!");
    }
});

// Load tweets in real-time
onValue(ref(db, 'tweets/'), (snapshot) => {
    tweetsContainer.innerHTML = "";  // Clear previous tweets
    snapshot.forEach((childSnapshot) => {
        const tweetData = childSnapshot.val();
        const tweetElement = document.createElement('div');
        tweetElement.className = 'tweet';
        tweetElement.innerHTML = `
            <p>${tweetData.content}</p>
            <small>Posted by ${tweetData.author} at ${new Date(tweetData.timestamp).toLocaleString()}</small>
            ${tweetData.userId === auth.currentUser?.uid ? `<button class="delete-btn" data-id="${childSnapshot.key}">Delete</button>` : ''}
        `;

        tweetsContainer.appendChild(tweetElement);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const tweetId = e.target.dataset.id;
            await remove(ref(db, 'tweets/' + tweetId));  // Delete the tweet from the database
        });
    });
});

// Sign out functionality
signoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "signpage.html";  // Redirect to sign-in page after signing out
});

// Ensure the user is authenticated
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "signpage.html";  // Redirect to sign-in page if not logged in
    }
});
