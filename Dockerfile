# Node 22 버전 사용
FROM node:22-alpine

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# TypeScript 빌드
RUN npx tsc

# 컨테이너 포트
EXPOSE 3000

# 서버 실행
CMD ["node", "dist/index.js"]
