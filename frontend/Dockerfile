FROM node:18-alpine

WORKDIR /app

# Definir argumento de build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copiar package.json y package-lock.json (si existen)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando para desarrollo
CMD ["npm", "start"] 