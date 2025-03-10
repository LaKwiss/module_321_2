require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const axios = require("axios");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Configuration des services
const CASTRO_SERVICE = "http://localhost:3002";

// Passport configuration : sérialisation et désérialisation de l'utilisateur
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configuration de la stratégie Google OAuth2
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // Vous pouvez, ici, effectuer un traitement (ex. sauvegarde dans votre base)
      return done(null, profile);
    }
  )
);

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

// Route pour démarrer le quiz
app.get("/quiz", auth, async (req, res) => {
  try {
    // On commence avec l'offset 0 (première question)
    const response = await axios.get(`${CASTRO_SERVICE}/quiz?offset=0`);

    if (response.data.finished) {
      // S'il n'y a pas de questions
      return res.render("start", { error: "Aucune question disponible" });
    }

    // Préparation des choix pour l'affichage dans le template
    const choices = [
      response.data.choice1,
      response.data.choice2,
      response.data.choice3,
      response.data.choice4,
    ];

    // Stockage de l'offset actuel dans la session
    req.session.currentOffset = 0;
    req.session.score = 0;

    res.render("quiz", {
      question: response.data.question,
      choices: choices,
      currentOffset: 0,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la question:", error);
    res.render("start", {
      error: "Erreur lors de la connexion au service de quiz",
    });
  }
});

// Route pour traiter la réponse au quiz
app.post("/quiz", auth, async (req, res) => {
  const { answer } = req.body;
  const currentOffset = req.session.currentOffset || 0;
  const userId = req.user.id;

  try {
    // Envoi de la réponse à Castro
    const response = await axios.post(`${CASTRO_SERVICE}/quiz`, {
      userId,
      answer,
      offset: currentOffset,
    });

    // Si la réponse est correcte, on met à jour le score dans la session
    if (response.data.correct) {
      req.session.score = (req.session.score || 0) + 1;
    }

    // Si on est à la fin du quiz
    if (response.data.nextOffset > 0) {
      // On récupère la prochaine question
      const nextQuestion = await axios.get(
        `${CASTRO_SERVICE}/quiz?offset=${response.data.nextOffset}`
      );

      if (nextQuestion.data.finished) {
        // Si c'était la dernière question, on affiche le résultat
        const totalResponse = await axios.get(
          `${CASTRO_SERVICE}/questions/count`
        );
        const total = totalResponse.data.count;

        return res.render("result", {
          score: req.session.score || 0,
          total: total,
        });
      }

      // Mise à jour de l'offset dans la session
      req.session.currentOffset = response.data.nextOffset;

      // Préparation des choix pour la prochaine question
      const choices = [
        nextQuestion.data.choice1,
        nextQuestion.data.choice2,
        nextQuestion.data.choice3,
        nextQuestion.data.choice4,
      ];

      res.render("quiz", {
        question: nextQuestion.data.question,
        choices: choices,
        currentOffset: response.data.nextOffset,
      });
    } else {
      // Gestion d'une erreur éventuelle
      res.render("start", { error: "Erreur lors du traitement de la réponse" });
    }
  } catch (error) {
    console.error("Erreur lors du traitement de la réponse:", error);
    res.render("start", {
      error: "Erreur lors de la connexion au service de quiz",
    });
  }
});

// Route pour ajouter une question
app.get("/add-question", auth, (req, res) => {
  res.render("add-question", { error: null });
});

// Route pour traiter l'ajout d'une question
app.post("/add-question", auth, async (req, res) => {
  const { question, choice1, choice2, choice3, choice4, answer } = req.body;

  // Vérification que tous les champs sont présents
  if (!question || !choice1 || !choice2 || !choice3 || !choice4 || !answer) {
    return res.render("add-question", { error: "Tous les champs sont requis" });
  }

  try {
    // Envoi de la nouvelle question à Castro
    await axios.post(`${CASTRO_SERVICE}/add-question`, {
      question,
      choice1,
      choice2,
      choice3,
      choice4,
      answer,
    });

    res.redirect("/");
  } catch (error) {
    console.error("Erreur lors de l'ajout de la question:", error);
    res.render("add-question", {
      error: "Erreur lors de l'ajout de la question",
    });
  }
});

// Déconnexion
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

const port = 3000;
app.listen(port, () => console.log(`Salazar app listening on port ${port}`));
