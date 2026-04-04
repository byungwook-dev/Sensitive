# Node.js 24 버전 기반 이미지 사용 (최신 환경)
FROM node:24-alpine

# 컨테이너 안에서 작업할 디렉토리 지정 (/app 폴더)
WORKDIR /app

# package.json, package-lock.json 파일만 먼저 복사 (의존성 설치 최적화)
COPY package*.json ./

# 의존성 설치 (React, Express 등 필요한 라이브러리 설치)
RUN npm install

# 나머지 소스 코드 전체 복사
COPY . .

# 프론트엔드 빌드 실행 (React 프로젝트라면 react-scripts build 실행됨)
RUN npm run build

# 컨테이너 실행 시 시작할 명령어 (백엔드 서버 실행)
CMD ["npm", "start"]

# 컨테이너가 외부와 통신할 포트 지정 (3000번 포트)
EXPOSE 3000
