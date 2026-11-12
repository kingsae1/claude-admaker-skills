#!/bin/sh
# 자리표시 영상 → render/ (render.mjs가 render/를 루트로 띄우므로 project.json에서는 /move.mp4 …)
# move.mp4: 그라데이션 위를 노란 원(제품 자리)이 좌우로 오가는 6초 · move_freeze.png: 2.0초 정지 프레임
set -e
mkdir -p render
ffmpeg -loglevel error -y -f lavfi -i "gradients=s=540x960:c0=0x203a8f:c1=0x7b2cbf:c2=0x0a9396:n=3:speed=0.015:d=6:r=30,format=yuv420p" \
  -vf "drawbox=x='120+150*sin(t*2.2)':y=380:w=300:h=300:color=0xFFD23F@1:t=fill,drawbox=x='170+150*sin(t*2.2)':y=430:w=60:h=60:color=0xFFFFFF@0.7:t=fill,drawgrid=w=90:h=90:t=1:c=white@0.12,scale=1080:1920" \
  -c:v libx264 -pix_fmt yuv420p render/move.mp4
ffmpeg -loglevel error -y -f lavfi -i "gradients=s=540x960:c0=0xff7a59:c1=0xffd36e:c2=0xf72585:n=3:speed=0.02:d=6:r=30,format=yuv420p" \
  -vf "drawbox=x=90:y='300+120*sin(t*1.6)':w=360:h=360:color=0x1d3557@1:t=fill,drawgrid=w=120:h=120:t=2:c=white@0.15,scale=1080:1920" \
  -c:v libx264 -pix_fmt yuv420p render/move2.mp4
ffmpeg -loglevel error -y -ss 2.0 -i render/move.mp4 -frames:v 1 render/move_freeze.png
echo "render/move.mp4, render/move2.mp4, render/move_freeze.png"
