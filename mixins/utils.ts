/**
 * Get number of days since the unix epoch
 */
export function get_timestamp() {
  const one_day = 24 * 60 * 60 * 1000;

  return Math.round((new Date().getTime() - new Date(0).getTime()) / one_day) -
    7;
}
