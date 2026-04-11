FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 빌드 시 환경변수 전달
ARG MONGODB_URI
ENV MONGODB_URI=$MONGODB_URI

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
