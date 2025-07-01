FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create directories
RUN mkdir -p /var/www/certbot

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]