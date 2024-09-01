import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDSU4RsY5zeQICARv6WUANKtgRoj17qhEo",
    authDomain: "edudb-4ce31.firebaseapp.com",
    projectId: "edudb-4ce31",
    storageBucket: "edudb-4ce31.appspot.com",
    messagingSenderId: "5542930290",
    appId: "1:5542930290:web:c038e21d164b6b60779feb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Sign Up Function
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save additional user data in the database
        await set(ref(db, 'users/' + user.uid), {
            name: name,
            username: username,
            email: email
        });

        alert("Sign Up Successful!");
        window.location.href = "index.html"; // Redirect to the main page after sign-up
    } catch (error) {
        console.error("Sign Up Error: ", error.message);
    }
});

// Sign In Function
document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('signin-username').value;
    const password = document.getElementById('signin-password').value;

    try {
        // Here, we'll assume users might input either username or email
        let signInMethod = signInWithEmailAndPassword(auth, usernameOrEmail, password);

        if (usernameOrEmail.includes("@")) {
            signInMethod = signInWithEmailAndPassword(auth, usernameOrEmail, password);
        } else {
            // Fetch email based on username from the database
            const snapshot = await get(ref(db, `usernames/${usernameOrEmail}`));
            const email = snapshot.val();
            signInMethod = signInWithEmailAndPassword(auth, email, password);
        }

        await signInMethod;
        alert("Sign In Successful!");
        window.location.href = "index.html"; // Redirect to the main page after sign-in
    } catch (error) {
        console.error("Sign In Error: ", error.message);
    }
});

// Sign Up/Sign In with Google
const googleProvider = new GoogleAuthProvider();

document.getElementById('google-signup').addEventListener('click', () => signInWithPopup(auth, googleProvider).then((result) => {
    // Add user to the database if they signed up using Google
    set(ref(db, 'users/' + result.user.uid), {
        name: result.user.displayName,
        email: result.user.email
    });
    window.location.href = "index.html";
}).catch((error) => console.error("Google Sign Up Error: ", error.message)));

document.getElementById('google-signin').addEventListener('click', () => signInWithPopup(auth, googleProvider).then(() => {
    window.location.href = "index.html";
}).catch((error) => console.error("Google Sign In Error: ", error.message)));

// Sign Up/Sign In with Facebook
const facebookProvider = new FacebookAuthProvider();

document.getElementById('facebook-signup').addEventListener('click', () => signInWithPopup(auth, facebookProvider).then((result) => {
    // Add user to the database if they signed up using Facebook
    set(ref(db, 'users/' + result.user.uid), {
        name: result.user.displayName,
        email: result.user.email
    });
    window.location.href = "index.html";
}).catch((error) => console.error("Facebook Sign Up Error: ", error.message)));

document.getElementById('facebook-signin').addEventListener('click', () => signInWithPopup(auth, facebookProvider).then(() => {
    window.location.href = "index.html";
}).catch((error) => console.error("Facebook Sign In Error: ", error.message)));

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
