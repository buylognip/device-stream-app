FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
ENV PORT=3000
ENV REQUIRE_PAIRING_CODE=false
CMD ["node", "server.js"]
