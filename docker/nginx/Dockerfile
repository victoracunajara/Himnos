FROM nginx:stable-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY index.html /var/www/html/
COPY himnario.html /var/www/html/
COPY json.html /var/www/html/
COPY css /var/www/html/css
COPY js /var/www/html/js

EXPOSE 80
