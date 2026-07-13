FROM node:22-slim

WORKDIR /app

# better-sqlite3 is a native module. Node 22 LTS has prebuilt binaries, so
# `prebuild-install` normally just downloads one. The toolchain is here so a
# prebuild miss degrades to a source compile instead of a failed build.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY package.json pnpm-lock.yaml ./

# pnpm 10 blocks dependency build scripts by default. package.json's
# pnpm.onlyBuiltDependencies allowlists better-sqlite3 — without it the install
# silently succeeds with no native binding and the container crashes at boot.
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# tsc copies imported JSON into the build output. If this is ever missing, the
# container boots and then dies while seeding — fail loudly at build time.
RUN test -f dist/db/seed.json || (echo "seed.json missing from build output" && exit 1)

ENV NODE_ENV=production

# NOT just documentation: Render reads EXPOSE to decide where to route traffic.
# It must match the port the app actually listens on, or the edge routes to a
# dead port and returns intermittent 404s (x-render-routing: no-server) while a
# background port scan slowly finds the real one. 10000 is Render's default PORT.
ENV PORT=10000
EXPOSE 10000

CMD ["node", "dist/index.js"]
