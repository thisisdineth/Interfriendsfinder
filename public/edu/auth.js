import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

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

// Sign Up Function
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signup-name').value;
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    const bio = document.getElementById('signup-bio').value;
    const photoFile = document.getElementById('signup-photo').files[0];

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let photoURL = "";
        if (photoFile && photoFile.size <= 2 * 1024 * 1024) { // Check if file size is within 2MB
            const storagePath = `profilePictures/${user.uid}/${photoFile.name}`;
            const imageRef = storageRef(storage, storagePath);
            await uploadBytes(imageRef, photoFile);
            photoURL = await getDownloadURL(imageRef);
        }

        // Save user data in the database
        await set(ref(db, 'users/' + user.uid), {
            name: name,
            username: username,
            email: email,
            role: role,
            bio: bio,
            photoURL: photoURL
        });

        alert("Sign Up Successful!");
        window.location.href = "index.html"; // Redirect to the main page after sign-up
    } catch (error) {
        console.error("Sign Up Error: ", error.message);
    }
});

// Google Sign Up / Sign In
const googleProvider = new GoogleAuthProvider();

document.getElementById('google-signup').addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);

        // If the user is signing up for the first time, ask for additional information
        if (!snapshot.exists()) {
            const name = prompt("Please enter your full name:");
            const username = prompt("Please choose a username:");
            const role = confirm("Are you a teacher? Click OK for yes, Cancel for no.") ? "teacher" : "student";
            const bio = prompt("Tell us a little about yourself (minimum 2 characters):");

            await set(userRef, {
                name: name,
                username: username,
                email: user.email,
                role: role,
                bio: bio,
                photoURL: user.photoURL || ""
            });

            alert("Sign Up Successful!");
            window.location.href = "index.html";
        } else {
            alert("Sign In Successful!");
            window.location.href = "index.html"; // Redirect to the main page after sign-in
        }
    } catch (error) {
        console.error("Google Sign Up/In Error: ", error.message);
    }
});

// Sign In Function
document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('signin-username').value;
    const password = document.getElementById('signin-password').value;

    try {
        await signInWithEmailAndPassword(auth, usernameOrEmail, password);
        alert("Sign In Successful!");
        window.location.href = "index.html"; // Redirect to the main page after sign-in
    } catch (error) {
        console.error("Sign In Error: ", error.message);
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

// Toggle between Sign Up and Sign In
document.addEventListener('DOMContentLoaded', () => {
    const switchBtn = document.getElementById('switch-btn');
    const signupContainer = document.getElementById('signup-container');
    const signinContainer = document.getElementById('signin-container');

    switchBtn.addEventListener('click', () => {
        if (signupContainer.style.display === 'none') {
            signupContainer.style.display = 'block';
            signinContainer.style.display = 'none';
            switchBtn.textContent = 'Already have an Account?';
        } else {
            signupContainer.style.display = 'none';
            signinContainer.style.display = 'block';
            switchBtn.textContent = 'Create an Account';
        }
    });
});
