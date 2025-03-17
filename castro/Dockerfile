FROM node:20-alpine

WORKDIR /app

# Copie des fichiers package.json et installation des dépendances
COPY package*.json ./
RUN npm install

# Copie du reste des fichiers de l'application
COPY . .

# Assurer que le répertoire data existe
RUN mkdir -p /app/data

# Exposition du port
EXPOSE 3002

# Healthcheck
RUN apk add --no-cache wget

# Commande de démarrage
CMD ["node", "app.js"]