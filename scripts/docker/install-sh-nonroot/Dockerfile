FROM ubuntu:24.04

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
RUN chmod +x /usr/local/bin/openclaw-ensure-ca-certificates \
  && set -eux; \
  for attempt in 1 2 3; do \
    if apt-get update -o Acquire::Retries=3; then break; fi; \
    echo "apt-get update failed (attempt ${attempt})" >&2; \
    if [ "${attempt}" -eq 3 ]; then exit 1; fi; \
    sleep 3; \
  done; \
  apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    sudo \
  && openclaw-ensure-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash app \
  && echo "app ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/app

USER app
WORKDIR /home/app

ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

COPY scripts/docker/install-sh-nonroot/run.sh /usr/local/bin/openclaw-install-nonroot
RUN sudo chmod +x /usr/local/bin/openclaw-install-nonroot

ENTRYPOINT ["/usr/local/bin/openclaw-install-nonroot"]
