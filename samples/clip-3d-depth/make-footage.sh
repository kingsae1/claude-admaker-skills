#!/bin/sh
# 자리표시 영상 2개 → render/ (render.mjs가 render/를 루트로 띄우므로 project.json에서는 /bg.mp4, /screen.mp4)
set -e
mkdir -p render
ffmpeg -loglevel error -y -f lavfi -i "gradients=s=540x960:c0=0x1b1446:c1=0x0e5a7a:c2=0x3a1f5c:n=3:speed=0.02:d=8:r=30,scale=1080:1920" \
  -c:v libx264 -pix_fmt yuv420p render/bg.mp4
ffmpeg -loglevel error -y -f lavfi -i "gradients=s=360x640:c0=0xff7a59:c1=0xffd36e:speed=0.06:d=8:r=30,scale=720:1280,drawbox=x=60:y=900:w=600:h=40:color=white@0.85:t=fill,drawbox=x=60:y=970:w=420:h=30:color=white@0.6:t=fill,drawgrid=w=120:h=120:t=2:c=white@0.15" \
  -c:v libx264 -pix_fmt yuv420p render/screen.mp4
echo "render/bg.mp4, render/screen.mp4"
