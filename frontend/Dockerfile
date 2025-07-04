FROM node:18-alpine

WORKDIR /app

# Copiar package.json y package-lock.json (si existen)
COPY package*.json ./

# Instalar dependencias
RUN npm install


RUN npm install bootstrap
# Copiar el resto del código
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando para desarrollo
CMD ["npm", "start"] 