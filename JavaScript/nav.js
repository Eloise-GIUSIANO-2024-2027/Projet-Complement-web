document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-link").forEach(link => {
        const linkFile = link.href.split("/").pop();
        const currentFile = window.location.pathname.split("/").pop();

        if (linkFile === currentFile) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });
});