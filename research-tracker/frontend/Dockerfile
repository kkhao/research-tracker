FROM node:20-alpine

# Railway Variables (runtime): BACKEND_URL, NEXT_PUBLIC_API_URL
# - BACKEND_URL: backend API URL for proxy (e.g. https://xxx.up.railway.app)
# - NEXT_PUBLIC_API_URL: used for build + direct fallback when proxy returns 502

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
