
FROM jonasal/nginx-certbot:5.6.0-nginx1.28.0-alpine as base
ARG GEOIP_MODULE_VERSION="3.4"
RUN NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9.]*')
RUN apk add --no-cache \
    libmaxminddb-dev

FROM base as downloader
WORKDIR /
RUN NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9.]*')
RUN wget http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar zxvf nginx-${NGINX_VERSION}.tar.gz
RUN wget https://github.com/leev/ngx_http_geoip2_module/archive/refs/tags/${GEOIP_MODULE_VERSION}.tar.gz && \
    tar zxvf ${GEOIP_MODULE_VERSION}.tar.gz

FROM downloader as builder
RUN apk add --no-cache \
    build-base \
    pcre-dev \
    zlib-dev \
    openssl-dev

WORKDIR /nginx-${NGINX_VERSION}
RUN ./configure --with-compat --add-dynamic-module=../ngx_http_geoip2_module-${GEOIP_MODULE_VERSION}

RUN make modules

# Extract OTel module from official nginx otel image (Alpine version)
FROM nginx:1.28.0-alpine-otel as otel_source

FROM base as runner
RUN apk add --no-cache \
    grpc-cpp \
    c-ares \
    re2 \
    libprotobuf \
    abseil-cpp-log-initialize
COPY --from=builder /nginx-${NGINX_VERSION}/objs/ngx_http_geoip2_module.so /etc/nginx/modules/ngx_http_geoip2_module.so
COPY --from=otel_source /usr/lib/nginx/modules/ngx_otel_module.so /etc/nginx/modules/ngx_otel_module.so
