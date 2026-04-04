# Node.js 24 버전 기반 이미지 사용
FROM node:24-alpine

# 컨테이너 안에서 작업할 디렉토리 지정
WORKDIR /app

# package.json, package-lock.json 복사 후 의존성 설치
COPY package*.json ./
RUN npm install

# 나머지 소스 복사
COPY . .

# 빌드 단계 (프로젝트에 build 스크립트가 있다면 유지, 없다면 제거 가능)
RUN npm run build

# 컨테이너 실행 시 시작할 명령어
CMD ["npm", "start"]

# 컨테이너가 외부와 통신할 포트
EXPOSE 3000
