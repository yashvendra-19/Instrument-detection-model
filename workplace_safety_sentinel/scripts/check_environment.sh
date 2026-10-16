#!/usr/bin/env bash
# Workplace Safety Sentinel - environment diagnostics. Read-only; changes nothing.
# Usage: scripts/check_environment.sh            (report saved under reports/)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/reports/environment_report_$(hostname)_$(date -u +%Y%m%dT%H%M%SZ).txt"
mkdir -p "$ROOT/reports"

run() { echo "\$ $*"; timeout 30 bash -c "$*" 2>&1 | head -40; echo "[exit ${PIPESTATUS[0]}]"; echo; }

{
echo "# Environment report - $(date -u +%FT%TZ) - host $(hostname)"
echo "## OS / CPU";            run "uname -a"; run "uname -m"; run "cat /etc/os-release | head -4"
run "cat /etc/nv_tegra_release"          # Jetson only
echo "## Display";             echo "XDG_SESSION_TYPE=${XDG_SESSION_TYPE:-<unset>} DISPLAY=${DISPLAY:-<unset>}"; echo
echo "## NVIDIA GPU / driver"; run "nvidia-smi"; run "ls /dev/nvidia* 2>/dev/null"
echo "## CUDA";                run "nvcc --version"; run "ls -d /usr/local/cuda*"
echo "## TensorRT";            run "which trtexec || ls /usr/src/tensorrt/bin/trtexec"
run "dpkg -l | grep -iE 'tensorrt|nvinfer' | head"
run "python3 -c 'import tensorrt; print(tensorrt.__version__)'"
echo "## DeepStream";          run "deepstream-app --version-all"
run "ls /opt/nvidia/deepstream/"
run "ls /opt/nvidia/deepstream/deepstream/samples/streams/"
run "gst-inspect-1.0 nvinfer | head -5"
run "gst-inspect-1.0 nvtracker | head -5"
echo "## PipeGen";             run "which pipegen"; run "pipegen --version"; run "pipegen --help"
run "pip list 2>/dev/null | grep -iE 'pipegen|craftif'"
echo "## Camera";              run "ls -l /dev/video*"; run "v4l2-ctl --list-devices"
echo "## Python";              run "which python3; python3 --version"
run "python3 -c 'import yaml, paho.mqtt; print(\"yaml ok, paho\", paho.mqtt.__version__)'"
echo "## MQTT broker";         run "which mosquitto mosquitto_sub mosquitto_pub"
echo "## Disk / memory";       run "df -h \"$ROOT\""; run "free -h"
} | tee "$OUT"
echo "Saved: $OUT"
