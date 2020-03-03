FROM node:11-alpine
WORKDIR /bot
COPY package*.json ./
RUN npm install --production
COPY dist/*.js ./
CMD ["node", "start.js"]
