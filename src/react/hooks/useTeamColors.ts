import { useEffect, useState } from 'react';
import {
  getTeamColors,
  subscribeTeamColors,
  type TeamColors,
} from '../../team-colors';

export function useTeamColors(): TeamColors {
  const [colors, setColors] = useState<TeamColors>(getTeamColors);
  useEffect(() => subscribeTeamColors(setColors), []);
  return colors;
}
