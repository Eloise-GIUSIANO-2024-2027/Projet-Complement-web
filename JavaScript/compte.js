/**
 * compte.js
 * Gestion de l'authentification côté client.
 * Utilise localStorage pour persister la session entre les rechargements de page.
 */
const viewLogin = document.getElementById("viewLogin");
const viewCompte = document.getElementById("viewCompte");

if (localStorage.getItem("hhh_login")) {
    viewLogin.style.display = "none";
    viewCompte.style.display = "flex";
}

/**
 * Connexion : enregistre le login dans localStorage,
 * puis bascule l'affichage vers la vue compte.
 */
document.getElementById("btnLogin").addEventListener("click", () => {
    localStorage.setItem("hhh_login", "admin");
    viewLogin.style.display = "none";
    viewCompte.style.display = "flex";
});

/**
 * Déconnexion : supprime la clé de session dans localStorage,
 * puis repasse à la vue de connexion.
 */
document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("hhh_login");
    viewCompte.style.display = "none";
    viewLogin.style.display = "flex";
});