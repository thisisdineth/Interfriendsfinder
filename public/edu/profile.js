import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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
const userInfoContainer = document.querySelector('.user-info');
const userTweetsContainer = document.getElementById('user-tweets-container');
const signoutBtn = document.getElementById('signout-btn');

// Load user information and tweets
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Display user info
        userInfoContainer.innerHTML = `
            <p><strong>Name:</strong> ${user.displayName}</p>
            <p><strong>Email:</strong> ${user.email}</p>
        `;

        // Load user tweets
        const userTweetsRef = ref(db, 'tweets/');
        onValue(userTweetsRef, (snapshot) => {
            userTweetsContainer.innerHTML = "";  // Clear previous tweets
            snapshot.forEach((childSnapshot) => {
                const tweetData = childSnapshot.val();
                if (tweetData.userId === user.uid) {
                    const tweetElement = document.createElement('div');
                    tweetElement.className = 'tweet';
                    tweetElement.innerHTML = `
                        <p>${tweetData.content}</p>
                        <small>Posted on ${new Date(tweetData.timestamp).toLocaleString()}</small>
                        <button class="delete-btn" data-id="${childSnapshot.key}">Delete</button>
                    `;
                    userTweetsContainer.appendChild(tweetElement);
                }
            });

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const tweetId = e.target.dataset.id;
                    await remove(ref(db, 'tweets/' + tweetId));  // Delete the tweet from the database
                });
            });
        });
    } else {
        window.location.href = "signpage.html";  // Redirect to sign-in page if not logged in
    }
});

// Sign out functionality
signoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "signpage.html";  // Redirect to sign-in page after signing out
});
