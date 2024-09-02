import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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
const tweetForm = document.getElementById('new-tweet');
const postTweetBtn = document.getElementById('post-tweet-btn');
const tweetsContainer = document.getElementById('tweets-container');
const signoutBtn = document.getElementById('signout-btn');

// Post a new tweet
postTweetBtn.addEventListener('click', async () => {
    const tweetContent = tweetForm.value.trim();
    if (tweetContent === "") return;

    const user = auth.currentUser;

    if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        const userData = (await get(userRef)).val();
        
        const tweetRef = ref(db, 'tweets/');
        const newTweet = {
            content: tweetContent,
            author: `${userData.name} (${userData.role})`,
            username: userData.username,
            photoURL: userData.photoURL || "",
            bio: userData.bio,
            userId: user.uid,
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: []  // Array to store user IDs who liked the tweet
        };

        await push(tweetRef, newTweet);
        tweetForm.value = ""; // Clear the input field after posting
    } else {
        alert("You must be logged in to post a tweet!");
    }
});

// Load tweets in real-time
onValue(ref(db, 'tweets/'), (snapshot) => {
    tweetsContainer.innerHTML = ""; // Clear previous tweets
    snapshot.forEach((childSnapshot) => {
        const tweetData = childSnapshot.val();
        const tweetId = childSnapshot.key;
        const tweetElement = document.createElement('div');
        tweetElement.className = 'tweet';
        tweetElement.innerHTML = `
            <div class="tweet-header">
                <img src="${tweetData.photoURL}" alt="${tweetData.author}'s Profile Picture">
                <h3 class="fullname">${tweetData.author}</h3>
                <div class="bio-tooltip">${tweetData.bio}</div>
            </div>
            <p>${tweetData.content}</p>
            <small>Posted by ${tweetData.author} at ${new Date(tweetData.timestamp).toLocaleString()}</small>
            <div class="actions">
                <button class="reply-btn" data-id="${tweetId}" data-author="${tweetData.author}">Reply</button>
                ${tweetData.userId === auth.currentUser?.uid ? `<button class="delete-btn" data-id="${tweetId}">Delete</button>` : ''}
                <button class="like-btn" data-id="${tweetId}" data-liked-by="${tweetData.likedBy?.includes(auth.currentUser?.uid) ? 'true' : 'false'}">
                    <i class="fa fa-thumbs-up"></i> Like <span class="like-count">${tweetData.likes}</span>
                </button>
                <button class="load-replies-btn" data-id="${tweetId}">Load Replies</button>
            </div>
            <div class="replies-container" id="replies-${tweetId}"></div>
        `;

        tweetsContainer.appendChild(tweetElement);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const tweetId = e.target.dataset.id;
            await remove(ref(db, 'tweets/' + tweetId)); // Delete the tweet from the database
            await remove(ref(db, 'replies/' + tweetId)); // Also delete all replies associated with this tweet
        });
    });

    // Add event listeners for reply buttons
    document.querySelectorAll('.reply-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tweetId = button.dataset.id;
            const replyAuthor = button.dataset.author;
            const replyContent = prompt(`Replying to ${replyAuthor}:`);
            if (replyContent && replyContent.trim() !== "") {
                postReply(tweetId, replyContent, replyAuthor);
            }
        });
    });

    // Add event listeners for load replies buttons
    document.querySelectorAll('.load-replies-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const tweetId = button.dataset.id;
            const repliesContainer = document.getElementById(`replies-${tweetId}`);
            const isVisible = repliesContainer.style.display === 'block';
            repliesContainer.style.display = isVisible ? 'none' : 'block'; // Toggle visibility

            if (!isVisible) {
                loadReplies(tweetId, repliesContainer);
            }
        });
    });

    // Add event listeners for like buttons
    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const tweetId = e.target.dataset.id;
            const tweetRef = ref(db, 'tweets/' + tweetId);
            const tweetSnapshot = await get(tweetRef);
            const tweetData = tweetSnapshot.val();

            if (tweetData) {  // Ensure tweetData is not null or undefined
                const likedBy = tweetData.likedBy || [];
                const userId = auth.currentUser.uid;

                let newLikes;
                if (likedBy.includes(userId)) {
                    // Unlike the tweet
                    newLikes = tweetData.likes - 1;
                    likedBy.splice(likedBy.indexOf(userId), 1);
                } else {
                    // Like the tweet
                    newLikes = tweetData.likes + 1;
                    likedBy.push(userId);
                }

                await update(tweetRef, { likes: newLikes, likedBy: likedBy });

                // Update the button appearance
                e.target.dataset.likedBy = likedBy.includes(userId) ? 'true' : 'false';
                e.target.querySelector('.like-count').innerText = newLikes;
            } else {
                console.error("Tweet data is null or undefined. Cannot update likes.");
            }
        });
    });
});

// Function to post a reply
const postReply = async (tweetId, content, replyAuthor) => {
    const user = auth.currentUser;
    if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        const userData = (await get(userRef)).val();

        const replyRef = ref(db, `replies/${tweetId}`);
        const newReply = {
            content: `${content}`,
            author: `${userData.name} (${userData.role})`,
            username: userData.username,
            bio: userData.bio,
            userId: user.uid,
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: []  // Array to store user IDs who liked the reply
        };

        await push(replyRef, newReply); // Push the new reply to the database
    }
};

// Function to load replies for a specific tweet
const loadReplies = (tweetId, container) => {
    onValue(ref(db, `replies/${tweetId}`), (snapshot) => {
        container.innerHTML = ""; // Clear previous replies
        snapshot.forEach((childSnapshot) => {
            const replyData = childSnapshot.val();
            const replyId = childSnapshot.key;

            const replyElement = document.createElement('div');
            replyElement.className = 'reply';
            replyElement.innerHTML = `
                <p>${replyData.content}</p>
                <small>Posted by ${replyData.author} at ${new Date(replyData.timestamp).toLocaleString()}</small>
                <div class="actions">
                    <button class="reply-btn" data-id="${replyId}" data-tweet-id="${tweetId}" data-author="${replyData.author}">Reply</button>
                    <button class="like-btn" data-id="${replyId}" data-tweet-id="${tweetId}" data-liked-by="${replyData.likedBy?.includes(auth.currentUser?.uid) ? 'true' : 'false'}">
                        <i class="fa fa-thumbs-up"></i> Like <span class="like-count">${replyData.likes}</span>
                    </button>
                    ${replyData.userId === auth.currentUser?.uid ? `<button class="delete-reply-btn" data-id="${replyId}" data-tweet-id="${tweetId}">Delete</button>` : ''}
                </div>
            `;

            container.appendChild(replyElement);
        });

        // Add event listeners for delete reply buttons
        document.querySelectorAll('.delete-reply-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const replyId = e.target.dataset.id;
                const tweetId = e.target.dataset.tweetId;
                await remove(ref(db, `replies/${tweetId}/${replyId}`)); // Delete the reply from the database
            });
        });

        // Add event listeners for reply-to-reply buttons
        document.querySelectorAll('.reply-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tweetId = button.dataset.tweetId;
                const replyId = button.dataset.id;
                const replyAuthor = button.dataset.author;
                const replyContent = prompt(`Replying to ${replyAuthor}:`);
                if (replyContent && replyContent.trim() !== "") {
                    postReply(tweetId, replyContent, replyAuthor, replyId);
                }
            });
        });

        // Add event listeners for like buttons on replies
        document.querySelectorAll('.like-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const replyId = e.target.dataset.id;
                const tweetId = e.target.dataset.tweetId;
                const replyRef = ref(db, `replies/${tweetId}/${replyId}`);
                const replySnapshot = await get(replyRef);
                const replyData = replySnapshot.val();

                if (replyData) {  // Ensure replyData is not null or undefined
                    const likedBy = replyData.likedBy || [];
                    const userId = auth.currentUser.uid;

                    let newLikes;
                    if (likedBy.includes(userId)) {
                        // Unlike the reply
                        newLikes = replyData.likes - 1;
                        likedBy.splice(likedBy.indexOf(userId), 1);
                    } else {
                        // Like the reply
                        newLikes = replyData.likes + 1;
                        likedBy.push(userId);
                    }

                    await update(replyRef, { likes: newLikes, likedBy: likedBy });

                    // Update the button appearance
                    e.target.dataset.likedBy = likedBy.includes(userId) ? 'true' : 'false';
                    e.target.querySelector('.like-count').innerText = newLikes;
                } else {
                    console.error("Reply data is null or undefined. Cannot update likes.");
                }
            });
        });
    });
};

// Sign out functionality
signoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "signpage.html"; // Redirect to sign-in page after signing out
});

// Ensure the user is authenticated
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "signpage.html"; // Redirect to sign-in page if not logged in
    }
});
