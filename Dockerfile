# --- Build frontend ---
FROM node:22-slim AS frontend-build

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build
COPY src/ src/
COPY index.html vite.config.ts tsconfig.json ./
COPY public/ public/
COPY *.png *.ico ./

RUN yarn build

# --- Production (PHP on Apache) ---
FROM php:8.4-apache

RUN docker-php-ext-install pdo pdo_mysql

# Enable mod_rewrite for .htaccess
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy PHP server into Apache document root
COPY packages/server-php/ /var/www/html/api/
WORKDIR /var/www/html/api
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy built frontend into document root
COPY --from=frontend-build /app/dist /var/www/html/

# Apache config: AllowOverride for .htaccess
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Add cron for session cleanup
RUN echo "0 0 * * * php /var/www/html/api/bin/cleanup-sessions.php" | crontab -

ENV APP_ENV=production

EXPOSE 80

CMD ["apache2-foreground"]
