FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx src/server.ts"]
