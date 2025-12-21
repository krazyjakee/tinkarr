#!/bin/bash

flatpak-spawn --host docker build -f backend/Dockerfile -t krazyjakee/tinkarr . && flatpak-spawn --host docker push krazyjakee/tinkarr