# --- Stage 1: Build the React Application ---
# We use Node 20 Alpine for a smaller base image during the build
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# and install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# IMPORTANT: Write the GEMINI_API_KEY into a .env.local file
# We are using an ARG (argument) which can be passed during the build process
ARG GEMINI_API_KEY
RUN echo "VITE_GEMINI_API_KEY=$GEMINI_API_KEY" > .env.local

# Build the React application. 'dist' is the default output folder for vite
RUN npm run build


# --- Stage 2: Serve the Built Application with Nginx ---
# Use Nginx Alpine, a very small and fast web server
FROM nginx:alpine

# Copy the custom nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app (from the 'builder' stage) to the Nginx public directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 8080 (as required by the prompt)
# Note: Nginx usually runs on 80, but Cloud Run needs the container to listen on $PORT, 
# and it's common practice to map the internal port to 8080. Our nginx.conf handles listening on 8080.
EXPOSE 8080

# Command to run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
