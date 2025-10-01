FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build for production if NODE_ENV is production
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# Pass build-time environment variables
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

ARG VITE_GOOGLE_TILES_API_KEY
ENV VITE_GOOGLE_TILES_API_KEY=${VITE_GOOGLE_TILES_API_KEY}

ARG VITE_MAIN_SEARCH_ADDRESS
ENV VITE_MAIN_SEARCH_ADDRESS=${VITE_MAIN_SEARCH_ADDRESS}

# If production, build the app
RUN if [ "$NODE_ENV" = "production" ]; then npm run build; fi

# Install serve for production
RUN if [ "$NODE_ENV" = "production" ]; then npm install -g serve; fi

# Expose port
EXPOSE 3000

# Run appropriate command based on NODE_ENV
CMD if [ "$NODE_ENV" = "production" ]; \
    then serve -s dist -l 3000; \
    else npm run dev -- --host 0.0.0.0; \
    fi