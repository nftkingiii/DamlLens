FROM golang:1.24-bookworm AS grpcurl

RUN go install github.com/fullstorydev/grpcurl/cmd/grpcurl@v1.9.3

FROM debian:bookworm-slim AS damlc

ARG DPM_BUNDLE_VERSION=3.5.2
ARG DAML_SDK_VERSION=3.5.2
ENV DPM_HOME=/opt/dpm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /tmp/dpm-sdk "${DPM_HOME}" \
    && curl -SLf "https://get.digitalasset.com/install/dpm-sdk/dpm-${DPM_BUNDLE_VERSION}-linux-amd64.tar.gz" -o /tmp/dpm.tar.gz \
    && tar xzf /tmp/dpm.tar.gz -C /tmp/dpm-sdk --strip-components 1 \
    && /tmp/dpm-sdk/bin/dpm bootstrap /tmp/dpm-sdk \
    && "${DPM_HOME}/bin/dpm" install "${DAML_SDK_VERSION}" \
    && test -x "${DPM_HOME}/cache/components/damlc/${DAML_SDK_VERSION}/damlc-dist-dpm/damlc"

FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DAMLLENS_DAMLC_PATH=/opt/damlc/damlc
ENV DAMLLENS_DAMLC_VERSION=3.5.2

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=grpcurl /go/bin/grpcurl /usr/local/bin/grpcurl
COPY --from=damlc /opt/dpm/cache/components/damlc/3.5.2/damlc-dist-dpm /opt/damlc
COPY package.json ./
COPY src ./src

RUN node --check src/server.js && grpcurl -version && /opt/damlc/damlc --version

EXPOSE 8787
CMD ["node", "src/server.js"]
