FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix server
COPY server/relay.cjs ./server/
COPY js/coop_protocol.js ./js/
ENV PORT=8742 BIND_ADDRESS=0.0.0.0
USER node
EXPOSE 8742
HEALTHCHECK --interval=30s CMD node -e "fetch('http://127.0.0.1:8742/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/relay.cjs"]
