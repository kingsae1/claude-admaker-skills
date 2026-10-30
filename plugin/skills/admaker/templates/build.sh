#!/bin/sh
# 한 줄 빌드: 프로젝트 생성 → 검사 → 오프라인 믹스 → 렌더 → 측정
set -e
mkdir -p out
SIZE=${SIZE:-1080x1920}
NAME=${NAME:-ad}
# 소재가 없을 때만: 합성 임시 사운드 키트 (aesthetic-rules S7)
[ "$SYNTH_AUDIO" = 1 ] && [ ! -d sfx ] && node gen-audio-kit.mjs sfx
node build-project.mjs --size "$SIZE" --out project.json
node validate.mjs project.json
node to-admaker-import.mjs project.json "out/${NAME}_${SIZE}.admaker-import.json"
# 플래너 모드 템플릿(씬 오버레이). 씬마다 나누려면 --from/--to (references/engine-recipes.md §9.1)
node to-admaker-template.mjs project.json "out/${NAME}_${SIZE}.admaker-import.json" "out/${NAME}_${SIZE}.template.json" --group "${GROUP:-$NAME}" --name "${TEMPLATE_NAME:-$NAME}"
# 오디오: 음악 덕킹·보이스 컴프·−14 LUFS 는 엔진이 못 하므로 여기서 만든다 (mix.py 또는 ffmpeg)
[ -f mix.py ] && python3 mix.py
node render/render.mjs project.json "out/${NAME}_${SIZE}.mp4"
ffmpeg -hide_banner -nostats -i "out/${NAME}_${SIZE}.mp4" -af ebur128=peak=true -f null - 2>&1 | tail -12
ffmpeg -hide_banner -nostats -i "out/${NAME}_${SIZE}.mp4" -vf blackdetect=d=0.1:pix_th=0.05 -an -f null - 2>&1 | grep blackdetect || echo "블랙 프레임 없음"
