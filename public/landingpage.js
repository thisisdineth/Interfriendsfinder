// Show loading screen for 5 seconds
window.addEventListener('load', function() {
    setTimeout(function() {
        document.body.classList.add('loaded');
    }, 1000); // 5 seconds delay
});
