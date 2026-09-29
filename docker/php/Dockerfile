FROM php:8.4-fpm-alpine

WORKDIR /var/www/html

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY api.php /var/www/html/api.php
COPY data /var/www/html/data

EXPOSE 9000
