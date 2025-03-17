# Application Quiz - Castro & Salazar

Cette application est composée de deux services distincts:

- **Castro**: Backend API pour la gestion des questions de quiz
- **Salazar**: Frontend pour l'interface utilisateur avec OAuth Google

## Configuration avec Docker

Cette architecture utilise Docker Compose pour orchestrer deux conteneurs distincts qui fonctionnent ensemble:

1. Un conteneur pour le service backend Castro (API)
2. Un conteneur pour le service frontend Salazar (UI)

### Prérequis

- Docker et Docker Compose installés
- Un compte Google Cloud Platform pour les identifiants OAuth

### Configuration initiale

1. Copiez les fichiers Dockerfile dans les répertoires appropriés:

   - `Dockerfile` dans le dossier `castro/`
   - `Dockerfile` dans le dossier `salazar/`

2. Copiez ou modifiez les fichiers `app.js` dans chaque répertoire pour inclure les modifications nécessaires

3. Créez un fichier `.env` à partir du modèle `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Éditez le fichier `.env` pour ajouter vos identifiants Google OAuth:
   ```
   GOOGLE_CLIENT_ID=votre_client_id_google
   GOOGLE_CLIENT_SECRET=votre_client_secret_google
   SESSION_SECRET=une_clé_secrète_pour_les_sessions
   ```

### Démarrage de l'application

1. Construisez et démarrez les conteneurs:

   ```bash
   docker-compose up -d
   ```

2. Accédez à l'application via:
   - Salazar (Frontend): http://localhost:3000
   - Castro (API): http://localhost:3002/health (pour vérifier que le service fonctionne)

### Structure des données persistantes

Les données sont stockées dans un volume Docker nommé `data`:

- `castro.db`: Base de données SQLite contenant les questions et scores

## Architecture des conteneurs

### Conteneur Castro

- Contient l'API REST pour gérer les questions et les scores
- Expose le port 3002
- Stocke les données dans un volume persistant

### Conteneur Salazar

- Contient l'interface utilisateur et l'authentification OAuth
- Expose le port 3000
- Communique avec Castro via le réseau interne Docker
- Dépend de Castro pour fonctionner (attend que Castro soit disponible)

## Maintenance

### Logs des conteneurs

```bash
# Voir les logs de tous les services
docker-compose logs

# Voir les logs d'un service spécifique
docker-compose logs salazar
docker-compose logs castro
```

### Redémarrage des services

```bash
# Redémarrer tous les services
docker-compose restart

# Redémarrer un service spécifique
docker-compose restart salazar
```

### Mise à jour des services

```bash
# Reconstruire et mettre à jour tous les services
docker-compose up -d --build

# Reconstruire et mettre à jour un service spécifique
docker-compose up -d --build castro
```

### Sauvegarde des données

```bash
# Créer une sauvegarde de la base de données
docker run --rm -v quiz-app_data:/data -v $(pwd):/backup alpine sh -c "cp /data/castro.db /backup/castro-backup.db"
```

## API Endpoints

### Castro API

- `GET /quiz?offset=X`: Récupère la question à l'index X
- `POST /quiz`: Soumet une réponse (userId, answer, offset)
- `GET /questions/count`: Récupère le nombre total de questions
- `POST /add-question`: Ajoute une nouvelle question
- `GET /user/score?userId=X`: Récupère le score d'un utilisateur
- `GET /health`: Vérifie l'état du service

### Salazar Routes

- `/`: Page d'accueil (authentification requise)
- `/login`: Page de connexion
- `/auth/google`: Authentification Google
- `/quiz`: Démarre un quiz
- `/add-question`: Ajoute une question
- `/logout`: Déconnexion
- `/health`: Vérifie l'état du service
