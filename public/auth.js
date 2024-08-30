// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";


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
const storage = getStorage(app);

// Utility functions
function showLoader() {
    document.getElementById('loading-container').style.display = 'block';
}

function hideLoader() {
    document.getElementById('loading-container').style.display = 'none';
}

function showMessage(message, isSuccess) {
    const messageContainer = document.getElementById('message-container');
    messageContainer.textContent = message;
    messageContainer.className = isSuccess ? 'message-success' : 'message-error';
    messageContainer.style.display = 'block';
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 3000);
}

// Validate Profile Picture Size
function validateProfilePicSize(file) {
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        showMessage("File size exceeds 2MB. Please upload a smaller file.", false);
        return false;
    }
    return true;
}

// Sign Up Function with Profile Picture and Size Validation
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();

    const name = document.getElementById('signup-name').value;
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const profilePicFile = document.getElementById('signup-profile-pic').files[0];

    // Validate file size
    if (!validateProfilePicSize(profilePicFile)) {
        hideLoader();
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Upload profile picture
        const profilePicRef = storageRef(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(profilePicRef, profilePicFile);
        const profilePicURL = await getDownloadURL(profilePicRef);

        // Save additional user data in the database
        await set(ref(db, 'users/' + user.uid), {
            name: name,
            username: username,
            email: email,
            profilePic: profilePicURL
        });

        showMessage("Sign Up Successful!", true);
        window.location.href = "index.html"; // Redirect to the main page after sign-up
    } catch (error) {
        console.error("Sign Up Error: ", error.message);
        showMessage("Sign Up Failed: " + error.message, false);
    } finally {
        hideLoader();
    }
});


// Sign In Function
document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    const usernameOrEmail = document.getElementById('signin-username').value;
    const password = document.getElementById('signin-password').value;

    try {
        let signInMethod;

        if (usernameOrEmail.includes("@")) {
            signInMethod = signInWithEmailAndPassword(auth, usernameOrEmail, password);
        } else {
            // Fetch email based on username from the database
            const snapshot = await get(ref(db, `usernames/${usernameOrEmail}`));
            const email = snapshot.val();
            if (email) {
                signInMethod = signInWithEmailAndPassword(auth, email, password);
            } else {
                throw new Error("Username not found.");
            }
        }

        await signInMethod;
        showMessage("Sign In Successful!", true);
        window.location.href = "index.html"; // Redirect to the main page after sign-in
    } catch (error) {
        console.error("Sign In Error: ", error.message);
        showMessage("Sign In Failed: " + error.message, false);
    } finally {
        hideLoader();
    }
});

// Google Sign Up with Username and Profile Picture Prompt
document.getElementById('google-signup').addEventListener('click', async () => {
    showLoader();
    try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const user = result.user;

        // Check if the user exists in the database
        const snapshot = await get(ref(db, 'users/' + user.uid));
        if (!snapshot.exists()) {
            // Prompt user for a username
            const username = prompt("Please enter a username:");
            let profilePicURL = '';

            // Prompt user to upload a profile picture
            const profilePicFile = document.getElementById('signup-profile-pic').files[0];
            if (profilePicFile) {
                // Validate file size
                if (!validateProfilePicSize(profilePicFile)) {
                    hideLoader();
                    return;
                }

                const profilePicRef = storageRef(storage, `profile_pictures/${user.uid}`);
                await uploadBytes(profilePicRef, profilePicFile);
                profilePicURL = await getDownloadURL(profilePicRef);
            } else {
                showMessage("Please upload a profile picture.", false);
                hideLoader();
                return;
            }

            // Save new user data in the database
            await set(ref(db, 'users/' + user.uid), {
                name: user.displayName,
                username: username,
                email: user.email,
                profilePic: profilePicURL
            });
        }

        showMessage("Sign Up with Google Successful!", true);
        window.location.href = "index.html"; // Redirect to the main page after sign-up
    } catch (error) {
        console.error("Google Sign Up Error: ", error.message);
        showMessage("Google Sign Up Failed: " + error.message, false);
    } finally {
        hideLoader();
    }
});
// Auth State Change Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);
    } else {
        console.log("No user is signed in.");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const switchBtn = document.getElementById('switch-btn');
    const signupContainer = document.getElementById('signup-container');
    const signinContainer = document.getElementById('signin-container');
    const signupImageContainer = document.getElementById('signup-image-container');
    const signinImageContainer = document.getElementById('signin-image-container');

    switchBtn.addEventListener('click', () => {
        if (signupContainer.style.display === 'none') {
            // Switch to Sign Up
            signupContainer.style.display = 'block';
            signinContainer.style.display = 'none';
            signupImageContainer.style.display = 'block';
            signinImageContainer.style.display = 'none';
            switchBtn.textContent = 'Already Have an Account?';
        } else {
            // Switch to Sign In
            signupContainer.style.display = 'none';
            signinContainer.style.display = 'block';
            signupImageContainer.style.display = 'none';
            signinImageContainer.style.display = 'block';
            switchBtn.textContent = 'Create an Account';
        }
    });
});

// Add an event listener to the forgot password link
document.getElementById('forgot-password-link').addEventListener('click', () => {
    // Show a loading message
    document.getElementById('loading-container').style.display = 'block';
    document.getElementById('message-container').style.display = 'none';

    // Send a password reset email using your email service (e.g. Gmail)
    // Replace 'your-email-service' with your actual email service
    fetch('Gmail', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: document.getElementById('signin-username').value
        })
    })
    .then(response => response.json())
    .then(data => {
        // Show a success message
        document.getElementById('loading-container').style.display = 'none';
        document.getElementById('message-container').style.display = 'block';
        document.getElementById('message-container').innerHTML = 'Password reset link sent to your email!';
    })
    .catch(error => {
        // Show an error message
        document.getElementById('loading-container').style.display = 'none';
        document.getElementById('message-container').style.display = 'block';
        document.getElementById('message-container').innerHTML = 'Error sending password reset link!';
    });
});