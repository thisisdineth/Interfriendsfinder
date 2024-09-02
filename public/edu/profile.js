import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, updatePassword, updateEmail } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, get, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

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
const storage = getStorage(app);

// DOM Elements
const profileForm = document.getElementById('profile-form');
const profilePhoto = document.getElementById('profile-photo');
const uploadPhoto = document.getElementById('upload-photo');
const profileName = document.getElementById('profile-name');
const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const profileBio = document.getElementById('profile-bio');
const profilePassword = document.getElementById('profile-password');
const updateProfileBtn = document.getElementById('update-profile-btn');
const deleteProfileBtn = document.getElementById('delete-profile-btn');
const userTweetsContainer = document.getElementById('user-tweets-container');
const userRepliesContainer = document.getElementById('user-replies-container');
const signoutBtn = document.getElementById('signout-btn');

// Load user profile
const loadUserProfile = async (user) => {
    try {
        const userRef = ref(db, `users/${user.uid}`);
        const userData = (await get(userRef)).val();

        if (userData) {
            profileName.value = userData.name || '';
            profileUsername.value = userData.username || '';
            profileEmail.value = userData.email || '';
            profileBio.value = userData.bio || '';

            if (userData.photoURL) {
                profilePhoto.src = userData.photoURL;
            } else {
                profilePhoto.src = 'https://via.placeholder.com/150';
            }
        } else {
            console.error('No user data found!');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
};

// Update profile
updateProfileBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = profileName.value;
    const username = profileUsername.value;
    const email = profileEmail.value;
    const bio = profileBio.value;
    const password = profilePassword.value;

    const userRef = ref(db, `users/${user.uid}`);
    const updates = { name, username, email, bio };

    try {
        await updateEmail(user, email);
        if (password) {
            await updatePassword(user, password);
        }
        await update(userRef, updates);

        if (uploadPhoto.files[0]) {
            const photoFile = uploadPhoto.files[0];
            const photoRef = storageRef(storage, `profilePictures/${user.uid}/${photoFile.name}`);
            await uploadBytes(photoRef, photoFile);
            const photoURL = await getDownloadURL(photoRef);
            await update(userRef, { photoURL });
            profilePhoto.src = photoURL;
        }

        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
    }
});

// Delete profile
deleteProfileBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmation = confirm('Are you sure you want to delete your profile? This action cannot be undone.');
    if (!confirmation) return;

    try {
        const userRef = ref(db, `users/${user.uid}`);

        const userData = (await get(userRef)).val();
        if (userData.photoURL) {
            const photoRef = storageRef(storage, userData.photoURL);
            await deleteObject(photoRef);
        }

        await remove(userRef);

        const tweetsRef = ref(db, 'tweets/');
        const repliesRef = ref(db, 'replies/');

        onValue(tweetsRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const tweetData = childSnapshot.val();
                if (tweetData.userId === user.uid) {
                    remove(ref(db, `tweets/${childSnapshot.key}`));
                }
            });
        });

        onValue(repliesRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const replyData = childSnapshot.val();
                if (replyData.userId === user.uid) {
                    remove(ref(db, `replies/${childSnapshot.key}`));
                }
            });
        });

        await signOut(auth);
        alert('Profile deleted successfully!');
        window.location.href = "signpage.html";
    } catch (error) {
        console.error('Error deleting profile:', error);
    }
});

// Load user's tweets
const loadUserTweets = async (user) => {
    try {
        const tweetsRef = ref(db, 'tweets/');
        onValue(tweetsRef, (snapshot) => {
            userTweetsContainer.innerHTML = "";
            snapshot.forEach((childSnapshot) => {
                const tweetData = childSnapshot.val();
                if (tweetData.userId === user.uid) {
                    const tweetElement = createTweetElement(childSnapshot.key, tweetData);
                    userTweetsContainer.appendChild(tweetElement);
                    loadRepliesForTweet(childSnapshot.key);  // Load replies for this tweet
                }
            });
        });
    } catch (error) {
        console.error('Error loading user tweets:', error);
    }
};

// Load replies for a specific tweet
const loadRepliesForTweet = async (tweetId) => {
    try {
        const repliesRef = ref(db, `replies/${tweetId}`);
        onValue(repliesRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const replyData = childSnapshot.val();
                if (replyData) {
                    const replyElement = createReplyElement(childSnapshot.key, replyData);
                    userRepliesContainer.appendChild(replyElement);
                }
            });
        });
    } catch (error) {
        console.error('Error loading replies:', error);
    }
};

// Create tweet element
const createTweetElement = (tweetId, tweetData) => {
    const tweetElement = document.createElement('div');
    tweetElement.className = 'tweet';
    tweetElement.innerHTML = `
        <p>${tweetData.content}</p>
        <small>Posted on ${new Date(tweetData.timestamp).toLocaleString()}</small>
        <div class="actions">
            <button class="delete-tweet-btn" data-id="${tweetId}">Delete</button>
        </div>
    `;

    tweetElement.querySelector('.delete-tweet-btn').addEventListener('click', async () => {
        try {
            await remove(ref(db, `tweets/${tweetId}`));
        } catch (error) {
            console.error('Error deleting tweet:', error);
        }
    });

    return tweetElement;
};

// Create reply element
const createReplyElement = (replyId, replyData) => {
    const replyElement = document.createElement('div');
    replyElement.className = 'reply';
    replyElement.innerHTML = `
        <p>${replyData.content}</p>
        <small>Posted on ${new Date(replyData.timestamp).toLocaleString()}</small>
        <div class="actions">
            <button class="delete-reply-btn" data-id="${replyId}">Delete</button>
        </div>
    `;

    replyElement.querySelector('.delete-reply-btn').addEventListener('click', async () => {
        try {
            await remove(ref(db, `replies/${replyId}`));
        } catch (error) {
            console.error('Error deleting reply:', error);
        }
    });

    return replyElement;
};

// Sign out functionality
signoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = "signpage.html";
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

// Ensure the user is authenticated and load profile data
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserProfile(user);
        loadUserTweets(user);
    } else {
        window.location.href = "signpage.html";
    }
});
