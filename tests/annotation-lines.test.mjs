// 글자 자리에 맞춘 손그림 강조 (templates/draw.mjs annotationForLines) — 앱 MCP draw_annotation clipId + text와 같은 계산
// node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { annotationForLines, PER_LINE_ANNOTATIONS } from '../plugin/skills/admaker/templates/draw.mjs';

/** 패스 d의 절대 좌표 점 (M/L/C/Q만 쓰는 패스) */
function points(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const out = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}
/** 하위 패스(M부터)마다 x 범위 */
function subpathSpans(d) {
  return d
    .split('M')
    .filter(Boolean)
    .map((part) => {
      const xs = points(`M${part}`).map((p) => p[0]);
      return [Math.min(...xs), Math.max(...xs)];
    });
}

test('한 줄 밑줄: 글자 왼쪽 끝부터 오른쪽 끝까지 덮음', () => {
  const line = { x: 300, y: 600, width: 420, height: 96 };
  const { box, path, lines } = annotationForLines('underline', [line], { seed: 7 });
  assert.equal(lines, 1);
  const [[x0, x1]] = subpathSpans(path);
  assert.ok(box.x + x0 <= line.x, `시작 ${box.x + x0} > 글자 왼쪽 ${line.x}`);
  assert.ok(box.x + x1 >= line.x + line.width, `끝 ${box.x + x1} < 글자 오른쪽 ${line.x + line.width}`);
  assert.ok(box.y >= line.y + line.height * 0.9, '밑줄이 글자 아래에 있어야 함');
});

test('두 줄 밑줄: 줄마다 그 줄 글자 폭만큼, 위 줄부터 순서대로 한 패스', () => {
  const l1 = { x: 200, y: 500, width: 680, height: 100 };
  const l2 = { x: 380, y: 640, width: 320, height: 100 };
  const { box, path, lines } = annotationForLines('underline', [l1, l2], { seed: 3 });
  assert.equal(lines, 2);
  const spans = subpathSpans(path);
  assert.ok(spans.length >= 2);
  const first = spans[0];
  const last = spans[spans.length - 1];
  assert.ok(box.x + first[0] <= l1.x && box.x + first[1] >= l1.x + l1.width, `1줄 ${first}`);
  assert.ok(box.x + last[0] <= l2.x && box.x + last[1] >= l2.x + l2.width, `2줄 ${last}`);
  assert.ok(box.x + last[0] > l1.x + 100, '2줄 밑줄이 1줄 폭으로 늘어나면 안 됨');
  // 첫 하위 패스는 1줄 아래, 마지막은 2줄 아래
  const yFirst = points(`M${path.split('M')[1]}`)[0][1] + box.y;
  const yLast = points(`M${path.split('M').at(-1)}`)[0][1] + box.y;
  assert.ok(yFirst > l1.y + l1.height * 0.9 && yFirst < l2.y, `1줄 y ${yFirst}`);
  assert.ok(yLast > l2.y + l2.height * 0.9, `2줄 y ${yLast}`);
});

test('감싸는 표시는 줄 상자 전체를 하나로 감쌈', () => {
  const l1 = { x: 200, y: 500, width: 680, height: 100 };
  const l2 = { x: 380, y: 640, width: 320, height: 100 };
  const { box, lines } = annotationForLines('circle', [l1, l2]);
  assert.equal(lines, 1);
  assert.ok(box.x < l1.x && box.x + box.width > l1.x + l1.width);
  assert.ok(box.y < l1.y && box.y + box.height > l2.y + l2.height);
});

test('줄마다 긋는 종류', () => {
  assert.deepEqual(PER_LINE_ANNOTATIONS, ['underline', 'doubleUnderline', 'strike']);
  assert.throws(() => annotationForLines('underline', []));
});
