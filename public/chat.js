import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, set, get, push, onValue, remove, serverTimestamp, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { filterBadWords } from './badword.js';
const firebaseConfig = {
  'apiKey': 'AIzaSyBTonYWFHgcxcVi1BBVeZkx823CfuT7CgM',
  'authDomain': "findaguest-3024b.firebaseapp.com",
  'databaseURL': "https://findaguest-3024b-default-rtdb.asia-southeast1.firebasedatabase.app",
  'projectId': "findaguest-3024b",
  'storageBucket': 'findaguest-3024b.appspot.com',
  'messagingSenderId': "292838904473",
  'appId': "1:292838904473:web:65cc9227374cb898581e08",
  'measurementId': "G-WPJK68Y0XZ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let currentUser = null;
let currentChatRoom = null;
let typingRef = null;
let replyMessageId = null;
let chatLeaveTimeout = null;
signInAnonymously(auth)['catch'](_0x245d67 => {
  console.error("Error signing in anonymously:", _0x245d67);
});
window.addEventListener("load", function () {
  setTimeout(function () {
    document.body.classList.add('loaded');
  }, 0x3e8);
});
onAuthStateChanged(auth, _0x441a06 => {
  if (_0x441a06) {
    currentUser = _0x441a06;
    updateUserStatus('available');
    setActiveUser();
    updateActiveUsersCount();
    const _0x46d63b = ref(db, "users/" + currentUser.uid + "/currentChatRoom");
    onValue(_0x46d63b, _0xb04c75 => {
      if (_0xb04c75.exists()) {
        currentChatRoom = _0xb04c75.val();
        redirectToChatRoom();
        listenForMessages();
        listenForTyping();
        resetInactivityTimer();
      }
    });
  }
});
function updateUserStatus(_0x940efe) {
  const _0x1701a3 = ref(db, "activeUsers/" + currentUser.uid);
  set(_0x1701a3, {
    'uid': currentUser.uid,
    'status': _0x940efe,
    'timestamp': serverTimestamp()
  });
}
function updateActiveUsersCount() {
  const _0x36ca1f = ref(db, "activeUsers");
  onValue(_0x36ca1f, _0x44ca92 => {
    const _0x1f7746 = _0x44ca92.exists() ? Object.keys(_0x44ca92.val()).length : 0x0;
    document.getElementById("active-user-count").textContent = _0x1f7746;
  });
}
function setActiveUser() {
  const _0x53953c = ref(db, "activeUsers/" + currentUser.uid);
  set(_0x53953c, {
    'uid': currentUser.uid,
    'status': 'available',
    'timestamp': serverTimestamp()
  });
  onDisconnect(_0x53953c).remove().then(() => {
    console.log("User disconnected.");
    updateActiveUsersCount();
  });
  document.addEventListener("visibilitychange", handleVisibilityChange);
}
function handleVisibilityChange() {
  if (document.hidden) {
    markUserInactive();
  } else {
    markUserActive();
  }
}
function markUserInactive() {
  updateUserStatus("available");
  clearTimeout(null);
  clearTimeout(chatLeaveTimeout);
}
function markUserActive() {
  updateUserStatus("available");
  resetInactivityTimer();
}
function resetInactivityTimer() {
  clearTimeout(chatLeaveTimeout);
  chatLeaveTimeout = setTimeout(leaveChatRoom, 0x1d4c0);
}
async function startChat() {
  try {
    const _0x4fafae = ref(db, "activeUsers");
    const _0x2482fd = await get(_0x4fafae);
    if (_0x2482fd.exists()) {
      const _0x5b3f16 = _0x2482fd.val();
      const _0x4ad86f = Object.keys(_0x5b3f16).filter(_0xffe0ed => _0xffe0ed !== currentUser.uid && _0x5b3f16[_0xffe0ed].status === 'available');
      if (_0x4ad86f.length > 0x0) {
        const _0x7ebfc7 = _0x4ad86f[Math.floor(Math.random() * _0x4ad86f.length)];
        await connectToChatRoom(_0x7ebfc7);
      } else {
        alert("No available users to start a chat. Please wait...");
      }
    } else {
      alert("No active users available.");
    }
  } catch (_0x481176) {
    console.error("Error starting chat:", _0x481176);
  }
}
async function connectToChatRoom(_0x28ace0) {
  if (_0x28ace0 === currentUser.uid) {
    console.error("Cannot connect to a chat room with yourself.");
    return;
  }
  const _0x27bcdc = ref(db, "chatRooms");
  const _0x12704f = ref(db, "users/" + currentUser.uid + "/currentChatRoom");
  const _0x2a7f57 = ref(db, "users/" + _0x28ace0 + '/currentChatRoom');
  let _0x32f68f = null;
  const _0x387b91 = await get(_0x27bcdc);
  if (_0x387b91.exists()) {
    _0x387b91.forEach(_0x51148c => {
      const _0x411fd1 = _0x51148c.val();
      if (_0x411fd1.users && _0x411fd1.users.includes(currentUser.uid) && _0x411fd1.users.includes(_0x28ace0)) {
        _0x32f68f = _0x51148c.key;
      }
    });
  }
  if (_0x32f68f) {
    currentChatRoom = _0x32f68f;
    await set(_0x12704f, currentChatRoom);
    await set(_0x2a7f57, currentChatRoom);
  } else {
    const _0x46c77b = push(_0x27bcdc);
    currentChatRoom = _0x46c77b.key;
    await set(_0x46c77b, {
      'users': [currentUser.uid, _0x28ace0],
      'messages': []
    });
    await set(_0x12704f, currentChatRoom);
    await set(_0x2a7f57, currentChatRoom);
  }
  updateUserStatus("busy");
  await set(ref(db, "activeUsers/" + _0x28ace0 + "/status"), "busy");
  console.log("Connected to chat room with ID: " + currentChatRoom);
  redirectToChatRoom();
  listenForMessages();
  listenForTyping();
  resetInactivityTimer();
}
function redirectToChatRoom() {
  alert("Successfully connected to a user! You can now start chatting.");
  document.getElementById("chat-container").style.display = "block";
}
function listenForMessages() {
  if (!currentChatRoom) {
    return;
  }
  const _0x1e9e01 = ref(db, "chatRooms/" + currentChatRoom + '/messages');
  onValue(_0x1e9e01, _0x242a97 => {
    const _0xa567a6 = document.getElementById('chat-box');
    _0xa567a6.innerHTML = '';
    _0x242a97.forEach(_0x5750f9 => {
      const _0x8f4659 = _0x5750f9.val();
      const _0x1731da = document.createElement("div");
      _0x1731da.classList.add("message");
      _0x1731da.classList.add(_0x8f4659.uid === currentUser.uid ? "you" : "stranger");
      const _0x2ab0ee = document.createElement("div");
      _0x2ab0ee.classList.add('message-text');
      _0x2ab0ee.innerHTML = filterBadWords(formatMathExpression(_0x8f4659.message));
      _0x1731da.appendChild(_0x2ab0ee);
      if (_0x8f4659.replyTo) {
        const _0x3845a2 = document.createElement("div");
        _0x3845a2.classList.add('reply');
        _0x3845a2.innerHTML = "Replying to: " + filterBadWords(formatMathExpression(_0x8f4659.replyTo.message));
        _0x1731da.appendChild(_0x3845a2);
      }
      _0xa567a6.appendChild(_0x1731da);
    });
    _0xa567a6.scrollTop = _0xa567a6.scrollHeight;
  });
}
function listenForTyping() {
  if (!currentChatRoom) {
    return;
  }
  typingRef = ref(db, 'chatRooms/' + currentChatRoom + "/typing");
  onValue(typingRef, _0x7e5fe6 => {
    const _0x3d0f7e = _0x7e5fe6.val();
    document.getElementById('typing-indicator').textContent = _0x3d0f7e && _0x3d0f7e.uid !== currentUser.uid ? "Stranger connected  type msg" : '';
  });
}
function handleTyping() {
  if (!currentChatRoom) {
    return;
  }
  const _0x2c47e7 = ref(db, 'chatRooms/' + currentChatRoom + "/typing/" + currentUser.uid);
  set(_0x2c47e7, {
    'uid': currentUser.uid,
    'timestamp': serverTimestamp()
  });
  resetInactivityTimer();
}
function sendMessage() {
  const _0x2ceccf = document.getElementById('chat-input').value;
  if (_0x2ceccf.trim() === '') {
    return;
  }
  const _0x5c3f63 = ref(db, "chatRooms/" + currentChatRoom + '/messages');
  const _0xba273e = push(_0x5c3f63);
  set(_0xba273e, {
    'uid': currentUser.uid,
    'message': filterBadWords(formatMathExpression(_0x2ceccf)),
    'replyTo': replyMessageId ? {
      'message': replyMessageId
    } : null,
    'timestamp': serverTimestamp()
  }).then(() => {
    document.getElementById('chat-input').value = '';
    document.getElementById('chat-input').placeholder = "You: Type a message...";
    replyMessageId = null;
    handleTyping();
    const _0x35ca80 = document.getElementById("chat-box");
    _0x35ca80.scrollTop = _0x35ca80.scrollHeight;
  })["catch"](_0x3d91f6 => {
    console.error("Error sending message:", _0x3d91f6);
  });
}
async function leaveChatRoom() {
  if (currentChatRoom) {
    const _0x1f78f8 = ref(db, "chatRooms/" + currentChatRoom);
    const _0x513ad6 = push(ref(db, "chatRooms/" + currentChatRoom + "/messages"));
    await set(_0x513ad6, {
      'uid': currentUser.uid,
      'message': "The user has left the chat.",
      'isSystemMessage': true,
      'timestamp': serverTimestamp()
    });
    setTimeout(async () => {
      await remove(_0x1f78f8);
      currentChatRoom = null;
      document.getElementById("chat-box").innerHTML = '';
      document.getElementById("chat-container").style.display = "none";
      alert("You have left the chat.");
      updateUserStatus("available");
    }, 0x1f4);
  }
}
function formatMathExpression(_0x49f5aa) {
  _0x49f5aa = _0x49f5aa.replace(/\^(\d+)/g, (_0x1bd339, _0x52a4b1) => "<sup>" + _0x52a4b1 + "</sup>");
  _0x49f5aa = _0x49f5aa.replace(/\*/g, '×');
  _0x49f5aa = _0x49f5aa.replace(/\//g, '÷');
  return _0x49f5aa;
}
document.getElementById("new-chat-btn").addEventListener("click", startChat);
document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("skip-btn").addEventListener('click', leaveChatRoom);
document.getElementById("chat-input").addEventListener("input", handleTyping);
document.getElementById("chat-input").addEventListener("keydown", _0x3e9c65 => {
  if (_0x3e9c65.key === "Enter") {
    _0x3e9c65.preventDefault();
    sendMessage();
  }
});
setInterval(() => {
  document.getElementById('local-time').textContent = new Date().toLocaleTimeString();
}, 0x3e8);