document.addEventListener("DOMContentLoaded", function () {
    const ctaButton = document.querySelector(".cta-button");

    ctaButton.addEventListener("mouseover", function () {
        this.style.backgroundColor = "#ff8533";
    });

    ctaButton.addEventListener("mouseout", function () {
        this.style.backgroundColor = "#ff6600";
    });
});
