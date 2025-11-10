# Custom n8n image with image processing tools
FROM n8nio/n8n:latest

# Install required tools for image processing
USER root

# Install ImageMagick, Python, and ExifTool
RUN apk add --no-cache \
    imagemagick \
    python3 \
    py3-pip \
    exiftool \
    && pip3 install --no-cache-dir pillow imagehash numpy

# Switch back to n8n user
USER node

# Keep default n8n entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["n8n", "start"]

