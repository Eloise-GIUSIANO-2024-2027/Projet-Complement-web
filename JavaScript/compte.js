const viewLogin  = document.getElementById("viewLogin");
const viewCompte = document.getElementById("viewCompte");

if (localStorage.getItem("hhh_login")) {
    viewLogin.style.display = "none";
    viewCompte.style.display = "flex";
}

document.getElementById("btnLogin").addEventListener("click", () => {
    localStorage.setItem("hhh_login", "admin");
    viewLogin.style.display = "none";
    viewCompte.style.display = "flex";
});

document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("hhh_login");
    viewCompte.style.display = "none";
    viewLogin.style.display = "flex";
});