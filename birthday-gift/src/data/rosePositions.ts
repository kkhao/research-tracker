/** 心形参数方程生成一点，scale 为缩放比例（内圈 < 1，外圈 > 1） */
function heartPoint(t: number, scale: number) {
  const x = 16 * Math.pow(Math.sin(t), 3) * scale;
  const y =
    (13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)) *
    scale;
  const left = 50 + (x / 16) * 38;
  const top = 50 - (y / 18) * 38;
  return { left: `${left}%`, top: `${top}%` };
}

const ROSE_COUNT_PER_RING = 32;

/** 内圈、中间一圈、外圈共三圈心形玫瑰 */
const innerRing = Array.from({ length: ROSE_COUNT_PER_RING }, (_, i) => {
  const t = (2 * Math.PI * i) / ROSE_COUNT_PER_RING;
  return heartPoint(t, 0.55);
});
const middleRing = Array.from({ length: ROSE_COUNT_PER_RING }, (_, i) => {
  const t = (2 * Math.PI * i) / ROSE_COUNT_PER_RING;
  return heartPoint(t, 1);
});
const outerRing = Array.from({ length: ROSE_COUNT_PER_RING }, (_, i) => {
  const t = (2 * Math.PI * i) / ROSE_COUNT_PER_RING;
  return heartPoint(t, 1.45);
});

export const ROSE_POSITIONS = [...innerRing, ...middleRing, ...outerRing];
