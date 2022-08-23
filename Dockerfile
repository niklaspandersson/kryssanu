FROM node:16-alpine as frontend
ARG GOOGLE_CLIENT_ID
ENV REACT_APP_GOOGLE_CLIENT_ID $GOOGLE_CLIENT_ID
WORKDIR /build/frontend
COPY client/. .
RUN yarn
RUN yarn build


FROM node:16-alpine as backend
WORKDIR /build/backend
COPY server/. .
RUN yarn
RUN yarn build


FROM node:16-alpine
WORKDIR /app

COPY server/package.json .
COPY server/yarn.lock .
ENV NODE_ENV production
RUN yarn install

COPY --from=frontend /build/frontend/build ./public_html
COPY --from=backend /build/backend/build .
COPY server/data/sweden.json birds.json

CMD ["node", "index.js"]