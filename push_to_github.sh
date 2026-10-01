#!/usr/bin/env bash
# Push Audiobook Studio to GitHub
set -e

cd "$(dirname "$0")"

echo "Pushing Audiobook Studio to git@github.com:0xlazorr/audiobook-studio.git..."
git push -u origin main

echo "Successfully pushed to GitHub!"
