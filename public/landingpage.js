// Loading screen removal
window.addEventListener('load', function() {
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 1500); // 1.5 seconds loading screen
});

// Toggle navigation menu in mobile view
document.querySelector('.hamburger').addEventListener('click', () => {
    document.querySelector('nav ul').classList.toggle('active');
});