FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run start


EXPOSE 4000

CMD ["node", "app.js"]