# Endgame tablebase service: upstream lila-tablebase (AGPL-3.0-or-later),
# unmodified, at a pinned commit. Upstream's own Dockerfile switches to a
# user it never creates, so this one builds the same binary itself.
FROM docker.io/rust:1-slim-bookworm AS build
ARG COMMIT=5eaf827193e69485c981fc10dcb7747198451964
RUN apt-get update && \
    apt-get install --yes --no-install-recommends libclang-dev libssl-dev gcc g++ make pkg-config git ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN git init -q . && \
    git fetch -q --depth 1 https://github.com/lichess-org/lila-tablebase.git "$COMMIT" && \
    git checkout -q FETCH_HEAD
RUN cargo build --release --locked

FROM docker.io/debian:bookworm-slim
RUN apt-get update && \
    apt-get install --yes --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    useradd --system tablebase
COPY --from=build /src/target/release/lila-tablebase /usr/local/bin/lila-tablebase
USER tablebase
EXPOSE 9000
ENTRYPOINT ["/usr/local/bin/lila-tablebase", "--bind", "0.0.0.0:9000", "--standard", "/tablebase"]
