import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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

// Ensure the user is authenticated before they can access the page
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Load user profile information
        loadUserProfile(user.uid);
        // Load study sessions
        loadStudySessions(user.uid);
        // Load notes
        loadNotes(user.uid);
        // Load exam marks
        loadExamMarks(user.uid);
    } else {
        // Redirect to sign-in page if not logged in
        window.location.href = "signpage.html";
    }
});

// Time Tracking Functionality
const startTimerBtn = document.getElementById('start-timer');
const stopTimerBtn = document.getElementById('stop-timer');
const subjectSelect = document.getElementById('subject');
let timerInterval;
let startTime;

startTimerBtn.addEventListener('click', () => {
    startTime = new Date();
    timerInterval = setInterval(() => {
        const elapsedTime = Math.floor((new Date() - startTime) / 1000);
        console.log(`Elapsed Time: ${elapsedTime} seconds`);
    }, 1000);
});

stopTimerBtn.addEventListener('click', async () => {
    clearInterval(timerInterval);
    const endTime = new Date();
    const elapsedTime = Math.floor((endTime - startTime) / 1000);

    // Save session to Firebase
    const userId = auth.currentUser.uid;
    const sessionRef = ref(db, `studySessions/${userId}`);
    await push(sessionRef, {
        subject: subjectSelect.value,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: elapsedTime
    });

    alert(`Session saved! You studied for ${Math.floor(elapsedTime / 60)} minutes.`);
    loadStudySessions(userId); // Reload study sessions
});

// Load Study Sessions from Firebase
const loadStudySessions = (userId) => {
    const sessionRef = ref(db, `studySessions/${userId}`);
    onValue(sessionRef, (snapshot) => {
        const logList = document.getElementById('log-list');
        logList.innerHTML = '';
        const labels = [];
        const data = [];
        snapshot.forEach(childSnapshot => {
            const session = childSnapshot.val();
            const li = document.createElement('li');
            li.textContent = `${session.subject}: ${Math.floor(session.duration / 60)} minutes on ${new Date(session.startTime).toLocaleDateString()}`;
            logList.appendChild(li);

            // Prepare data for chart
            labels.push(new Date(session.startTime).toLocaleDateString());
            data.push(Math.floor(session.duration / 60));
        });

        // Update chart
        studyTimeChart.data.labels = labels;
        studyTimeChart.data.datasets[0].data = data;
        studyTimeChart.update();
    });
};

// Initialize Study Time Chart
const studyTimeChartCtx = document.getElementById('study-time-chart').getContext('2d');
const studyTimeChart = new window.Chart(studyTimeChartCtx, {
    type: 'line',
    data: {
        labels: [],  // Will be populated dynamically
        datasets: [{
            label: 'Study Time (minutes)',
            data: [],  // Will be populated dynamically
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: false
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

// Notes Functionality
const saveNoteBtn = document.getElementById('save-note');
const noteText = document.getElementById('note-text');
const noteList = document.getElementById('note-list');

saveNoteBtn.addEventListener('click', async () => {
    const noteContent = noteText.value.trim();
    if (noteContent === "") return;

    const userId = auth.currentUser.uid;
    const notesRef = ref(db, `notes/${userId}`);
    await push(notesRef, {
        content: noteContent,
        timestamp: new Date().toISOString()
    });

    alert("Note saved!");
    noteText.value = ""; // Clear note text
    loadNotes(userId); // Reload notes
});

// Load Notes from Firebase
const loadNotes = (userId) => {
    const notesRef = ref(db, `notes/${userId}`);
    onValue(notesRef, (snapshot) => {
        noteList.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const note = childSnapshot.val();
            const li = document.createElement('li');
            li.textContent = `${note.content} (Saved on ${new Date(note.timestamp).toLocaleString()})`;
            noteList.appendChild(li);
        });
    });
};

// Exam Marks Functionality
const addMarkForm = document.getElementById('add-mark-form');
const examSubjectSelect = document.getElementById('exam-subject');
const examDateInput = document.getElementById('exam-date');
const examMarkInput = document.getElementById('exam-mark');
const examMarksChartCtx = document.getElementById('exam-marks-chart').getContext('2d');

const examMarksChart = new window.Chart(examMarksChartCtx, {
    type: 'bar',
    data: {
        labels: [],  // Will be populated dynamically
        datasets: [{
            label: 'Exam Marks',
            data: [],  // Will be populated dynamically
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

addMarkForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = auth.currentUser.uid;
    const examMarksRef = ref(db, `examMarks/${userId}`);
    await push(examMarksRef, {
        subject: examSubjectSelect.value,
        date: examDateInput.value,
        mark: parseInt(examMarkInput.value)
    });

    alert("Exam mark saved!");
    loadExamMarks(userId); // Reload exam marks
    examSubjectSelect.value = "biology";  // Reset form
    examDateInput.value = "";
    examMarkInput.value = "";
});

// Load Exam Marks from Firebase
const loadExamMarks = (userId) => {
    const examMarksRef = ref(db, `examMarks/${userId}`);
    onValue(examMarksRef, (snapshot) => {
        const labels = [];
        const data = [];
        snapshot.forEach(childSnapshot => {
            const exam = childSnapshot.val();
            labels.push(`${exam.subject} (${new Date(exam.date).toLocaleDateString()})`);
            data.push(exam.mark);
        });

        // Update chart
        examMarksChart.data.labels = labels;
        examMarksChart.data.datasets[0].data = data;
        examMarksChart.update();
    });
};

// Load User Profile
const loadUserProfile = (userId) => {
    const profileName = document.getElementById('profile-name');
    const profileStream = document.getElementById('profile-stream');
    const profileEmail = document.getElementById('profile-email');
    const profileBio = document.getElementById('profile-bio');
    const profilePhoto = document.getElementById('profile-photo');

    const userRef = ref(db, `users/${userId}`);
    onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        profileName.textContent = userData.name;
        profileStream.textContent = userData.stream;
        profileEmail.textContent = userData.email;
        profileBio.textContent = userData.bio;
        profilePhoto.src = userData.photoURL || 'default-avatar.png';
    });
};
