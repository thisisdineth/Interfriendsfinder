// Loading screen removal
window.addEventListener('load', function() {
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 1500); // 1.5 seconds loading screen
});
