FROM node:20-alpine

WORKDIR /app

# Copie des fichiers package.json et installation des dépendances
COPY package*.json ./
RUN npm install

# Copie du reste des fichiers de l'application
COPY . .

# Exposition du port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "app.js"]