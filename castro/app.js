const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Utiliser le chemin de la base de données depuis les variables d'environnement s'il est défini
const dbPath = process.env.DB_PATH || path.join(__dirname, "db.db");
console.log(`Utilisation de la base de données : ${dbPath}`);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Création de la table questions avec contrainte UNIQUE
  db.run(
    "CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, question TEXT UNIQUE, choice1 TEXT, choice2 TEXT, choice3 TEXT, choice4 TEXT, answer TEXT)"
  );
  // Création de la table user pour stocker l'id OAuth et le score
  db.run(
    "CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY, score INTEGER DEFAULT 0)"
  );
});

// Insertion de questions initiales (si elles n'existent pas déjà)
const initialQuestions = [
  {
    question: "Quelle est la capitale de la France?",
    choices: ["Paris", "Lyon", "Marseille", "Toulouse"],
    answer: "Paris",
  },
  {
    question: "Combien font 2 + 2?",
    choices: ["3", "4", "5", "6"],
    answer: "4",
  },
  {
    question: "Quel est le langage de programmation utilisé ici?",
    choices: ["Python", "Java", "JavaScript", "Ruby"],
    answer: "JavaScript",
  },
  {
    question: "Quelle est la couleur du cheval blanc d'Henri IV?",
    choices: ["Blanc", "Noir", "Gris", "Marron"],
    answer: "Blanc",
  },
];

initialQuestions.forEach((q) => {
  db.run(
    "INSERT OR IGNORE INTO questions (question, choice1, choice2, choice3, choice4, answer) VALUES (?, ?, ?, ?, ?, ?)",
    [
      q.question,
      q.choices[0],
      q.choices[1],
      q.choices[2],
      q.choices[3],
      q.answer,
    ]
  );
});

// Endpoint GET /quiz
// Renvoie la question correspondant à l'offset passé en query (par défaut 0)
app.get("/quiz", (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  db.get(
    "SELECT * FROM questions ORDER BY id LIMIT 1 OFFSET ?",
    [offset],
    (err, row) => {
      if (err || !row) {
        // Fin du quiz : renvoie le total de questions
        db.get("SELECT COUNT(*) as count FROM questions", (err, countRow) => {
          const total = countRow ? countRow.count : offset;
          res.json({ finished: true, total });
        });
      } else {
        res.json(row);
      }
    }
  );
});

// Endpoint POST /quiz
// Traite la réponse à la question. Expects : userId, answer, offset dans le corps de la requête.
app.post("/quiz", (req, res) => {
  const { userId, answer, offset } = req.body;
  const quizOffset = parseInt(offset) || 0;
  db.get(
    "SELECT * FROM questions ORDER BY id LIMIT 1 OFFSET ?",
    [quizOffset],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: "Question not found" });
      }
      let correct = false;
      if (answer === row.answer) {
        correct = true;
        // Mise à jour du score : insertion ou incrémentation (ON CONFLICT)
        db.run(
          "INSERT INTO user (id, score) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET score = score + 1",
          [userId],
          (err) => {
            if (err) console.error(err);
          }
        );
      } else {
        // S'assurer que l'utilisateur existe dans la table user
        db.run(
          "INSERT INTO user (id, score) VALUES (?, 0) ON CONFLICT(id) DO NOTHING",
          [userId],
          (err) => {
            if (err) console.error(err);
          }
        );
      }
      // Renvoie si la réponse était correcte et le prochain offset
      res.json({ correct, nextOffset: quizOffset + 1 });
    }
  );
});

// Endpoint GET /questions/count : retourne le nombre total de questions
app.get("/questions/count", (req, res) => {
  db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
    if (err) res.status(500).json({ error: "Internal error" });
    else res.json(row);
  });
});

// Endpoint POST /add-question pour ajouter une question (évite les doublons)
app.post("/add-question", (req, res) => {
  const { question, choice1, choice2, choice3, choice4, answer } = req.body;
  if (!question || !choice1 || !choice2 || !choice3 || !choice4 || !answer) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }
  db.run(
    "INSERT OR IGNORE INTO questions (question, choice1, choice2, choice3, choice4, answer) VALUES (?, ?, ?, ?, ?, ?)",
    [question, choice1, choice2, choice3, choice4, answer],
    function (err) {
      if (err) {
        res
          .status(500)
          .json({ error: "Erreur lors de l'ajout de la question" });
      } else {
        res.json({ success: true, questionId: this.lastID });
      }
    }
  );
});

// Endpoint GET /user/score : retourne le score d'un utilisateur (requiert userId en query)
app.get("/user/score", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  db.get("SELECT score FROM user WHERE id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: "Internal error" });
    res.json(row || { score: 0 });
  });
});

// Ajouter une route de statut/santé
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "castro" });
});

const port = process.env.CASTRO_PORT || 3002;
app.listen(port, "0.0.0.0", () =>
  console.log(`Castro app listening on port ${port}`)
);

// Gestion propre de l'arrêt pour fermer la base de données
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
