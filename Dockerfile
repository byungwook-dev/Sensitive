FROM node:22-alpine
WORKDIR /app

# package.json만 복사 후 설치
COPY package*.json ./
RUN npm install

# 전체 복사
COPY . .

# 빌드 시 필요한 환경변수만 ARG/ENV로 설정!
ARG MONGODB_URI
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ARG JWT_SECRET

ENV MONGODB_URI=$MONGODB_URI
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV JWT_SECRET=$JWT_SECRET

# ANTHROPIC_API_KEY는 빌드 시점에 필요 없음 → 제외
# 실행 시점에만 docker run -e 로 주입

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
