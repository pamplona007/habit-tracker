FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
