#!/usr/bin/env bash
# Restores disposable tools ONLY. Never renders, deletes, or overwrites project deliverables.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m pip install --user --disable-pip-version-check 'playwright==1.64.0' pillow numpy scipy soundfile 'imageio-ffmpeg==0.6.0'
python3 -m playwright install chromium
python3 -m playwright install-deps chromium
printf '\nEnvironment restored. No render performed.\n'
printf 'To rebuild the STATIC board after approved edits:\n'
printf '  python3 tools/build_preview.py\n  python3 tools/capture_stills.py\n'
printf 'For optional timing re-analysis only: pip install --user faster-whisper==1.2.1\n'
