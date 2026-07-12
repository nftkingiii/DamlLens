FROM golang:1.24-bookworm AS grpcurl

RUN go install github.com/fullstorydev/grpcurl/cmd/grpcurl@v1.9.3

FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=grpcurl /go/bin/grpcurl /usr/local/bin/grpcurl
COPY package.json ./
COPY src ./src

RUN node --check src/server.js && grpcurl -version

EXPOSE 8787
CMD ["node", "src/server.js"]
