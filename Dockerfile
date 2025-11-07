FROM mcr.microsoft.com/playwright:v1.56.1-jammy

ENV NODE_ENV=development \
    TZ=Etc/UTC \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PUPPETEER_SKIP_DOWNLOAD=true

# Install locales and common fonts to stabilize text rendering
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      locales \
      fontconfig \
      ca-certificates \
      fonts-noto \
      fonts-noto-cjk \
      fonts-noto-color-emoji \
      fonts-dejavu-core \
      fonts-liberation \
      fonts-freefont-ttf && \
    sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    sed -i 's/# tr_TR.UTF-8 UTF-8/tr_TR.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm ci

# Install Remotion project dependencies
COPY satarizaevideo/remotion/package*.json satarizaevideo/remotion/
RUN cd satarizaevideo/remotion && npm ci

# Copy source
COPY . .

# Expose dev app and API ports (used by Vite and server.mjs)
EXPOSE 5173 4000

# Create a stable Chromium path for tools like Remotion (Puppeteer)
RUN CHROME_PATH=$(node -e "const fs=require('fs');const p='/ms-playwright';const d=fs.readdirSync(p).find(x=>x.startsWith('chromium-'));console.log(p+'/'+d+'/chrome-linux/chrome')") \
    && ln -s "$CHROME_PATH" /usr/local/bin/chromium-playwright \
    && echo "Using Chromium at: $(readlink -f /usr/local/bin/chromium-playwright)"

ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium-playwright \
    REMOTION_CHROMIUM_EXECUTABLE=/usr/local/bin/chromium-playwright

CMD ["bash"]


