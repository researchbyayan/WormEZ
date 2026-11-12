#!/bin/zsh
set -eu
cd "${0:A:h}"
if [[ ! -x tapir-helper/.venv/bin/python || ! -f tapir-helper/tapir_checkpoint_panning.pt ]]; then
  echo "Automatic recovery is unavailable because the local model runtime is missing. See tapir-helper/README.md."
  exit 1
fi
if curl -fsS http://127.0.0.1:8765/tapir/status >/dev/null 2>&1; then
  open 'http://127.0.0.1:8765/WormEZ.html'
  exit 0
fi
tapir-helper/.venv/bin/python tapir-helper/server.py &
helper_pid=$!
trap 'kill $helper_pid 2>/dev/null || true' EXIT INT TERM
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:8765/tapir/status >/dev/null 2>&1; then
    open 'http://127.0.0.1:8765/WormEZ.html'
    wait $helper_pid
    exit $?
  fi
  sleep .2
done
echo 'TAPIR helper did not start. Check the error above.'
exit 1
