FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
RUN npm install && npm install --prefix client

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
