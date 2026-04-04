FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# React 빌드 실행 (OpenSSL 호환 모드 활성화)
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

CMD ["npm", "start"]

EXPOSE 3000
