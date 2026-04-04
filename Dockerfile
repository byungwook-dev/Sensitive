FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# React 빌드 실행
RUN npm run build

CMD ["npm", "start"]

EXPOSE 3000
