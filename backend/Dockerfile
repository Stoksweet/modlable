# Use Node.js 20 base image
FROM node:20-bookworm-slim

# Install Python 3, pip, venv, and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package configurations and install Node modules
COPY package*.json ./
RUN npm install

# Copy requirements and prepare isolation environment
COPY requirements.txt ./
RUN python3 -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt

# Copy rest of application code (including typescript source)
COPY . .

# Run type check validation layer prior to building the TS artifact
# We verify types to catch alignment issues during build time
RUN .venv/bin/python3 src/trainer/verify_types.py

# Build TypeScript
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
