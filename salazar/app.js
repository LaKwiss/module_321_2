const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Passport configuration : sérialisation et désérialisation de l'utilisateur
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configuration de la stratégie Google OAuth2
passport.use();

// Middleware pour protéger les routes
function auth(req, res, next) {
  if (req.isAuthenticated()) next();
  else res.redirect("/login");
}

// Route d'accueil
app.get("/", auth, (req, res) => {
  res.render("home", { user: req.user });
});

// Page de login
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Démarrage de l'authentification via Google
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback de Google après authentification
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);

// Déconnexion
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

const port = 3000;
app.listen(port, () => console.log(`salazar app listening on port ${port}`));
