FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libreoffice \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "start" ]