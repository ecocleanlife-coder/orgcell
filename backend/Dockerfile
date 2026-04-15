FROM node:20-alpine

# §8-F 브라우저 녹음 webm→mp3 변환용
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5001

CMD ["node", "server.js"]
