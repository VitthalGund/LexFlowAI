FROM node:18-alpine

WORKDIR /workspace

# Copy dependency files
COPY package*.json ./

# Install dependencies with legacy peer deps to avoid React 19 conflicts
RUN npm install --legacy-peer-deps

# Copy frontend source files
COPY . .

# Build Next.js
RUN npm run build

# Expose Next.js port
EXPOSE 3000

CMD ["npm", "run", "start"]
