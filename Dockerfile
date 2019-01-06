FROM node:11-alpine

WORKDIR /bot

COPY package*.json ./

# Set NODE_ENV=production ??
RUN npm install --production

COPY . .

# No need to EXPOSE anything
CMD ["node", "src/start.js"]

