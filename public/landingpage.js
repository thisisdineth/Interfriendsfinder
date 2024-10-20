// Show loading screen for 5 seconds
window.addEventListener('load', function() {
    setTimeout(function() {
        document.body.classList.add('loaded');
    }, 1000); // 5 seconds delay
});

// Scroll-up animation for images
window.addEventListener('scroll', function() {
    const scrollUpImages = document.querySelectorAll('.scroll-up-image');

    scrollUpImages.forEach(image => {
        const imageTop = image.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        if (imageTop < windowHeight - 50) {
            image.classList.add('show');
        } else {
            image.classList.remove('show');
        }
    });
});
// Select all sections with the "content-container" class
const sections = document.querySelectorAll('.content-container');

// Function to check if a section is in the viewport
function revealSections() {
    sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        // Check if the section is in view (scroll up)
        if (sectionTop < windowHeight - 50) {
            section.classList.add('reveal');
        } else {
            section.classList.remove('reveal');
        }
    });
}

// Event listener for scroll to trigger animations
window.addEventListener('scroll', revealSections);
