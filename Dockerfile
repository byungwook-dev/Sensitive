# Node.js 22-alpine 이미지 사용
FROM node:22-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 설치를 위한 package.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# TypeScript 빌드 (tsconfig.json 기준)
RUN npx tsc

# 컨테이너 포트 노출
EXPOSE 3000

# 앱 실행
CMD ["node", "dist/index.js"]
