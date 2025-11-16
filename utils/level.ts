import { LEVELS, LevelInfo } from "../type";

export function getUserLevel(points: number): LevelInfo {
  let level = LEVELS[0];
  for (const info of LEVELS) {
    if (points >= info.minPoints) {
      level = info;
    }
  }
  return level;
}
