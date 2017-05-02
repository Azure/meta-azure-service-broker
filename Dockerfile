FROM node:7.9.0

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app source
COPY . /usr/src/app/

# Install dependencies
RUN npm install

EXPOSE 5001
CMD [ "npm", "start" ]

ARG VERSION
ARG BUILD_DATE
ENV VERSION $VERSION
ENV BUILD_DATE $BUILD_DATE
