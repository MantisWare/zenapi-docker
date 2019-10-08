FROM node:11.1.0-alpine

LABEL maintainer="Waldo Marais <waldo@mantisware.co.za>" \
      org.label-schema.vendor="MantisWare" \
      org.label-schema.name="Zenapi Docker image" \
      org.label-schema.description="Zenapi containerized" \
      org.label-schema.url="https://zenapi.mantisware.co.za" \
      org.label-schema.vcs-url="https://github.com/MantisWare/zenapi-docker" \
      org.label-schema.version=latest \
      org.label-schema.schema-version="1.0"

WORKDIR /usr/src/api

RUN echo "unsafe-perm = true" >> ~/.npmrc

RUN npm install -g zenapi

COPY zenapi.sh ./
RUN chmod +x ./zenapi.sh

EXPOSE 5050

COPY healthcheck.js ./
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s \
      CMD node /usr/src/api/healthcheck.js

CMD ["./zenapi.sh"]
