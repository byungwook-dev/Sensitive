# Node.js 22-alpine 이미지 사용
FROM node:22-alpine

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# Next.js 서버 실행
CMD ["npm", "run", "start"]