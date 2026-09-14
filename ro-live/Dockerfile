FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/server
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.mjs"]
