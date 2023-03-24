export const filters = [
  "albums",
  "artists",
  "playlists",
  "community_playlists",
  "featured_playlists",
  "songs",
  "videos",
] as const;

export type Filter = typeof filters[number];

export const scopes = ["library", "uploads"] as const;

export type Scope = typeof scopes[number];

export function get_search_params(
  filter: Filter | null = null,
  scope: Scope | null = null,
  autocorrect: boolean,
) {
  if (filter == null && scope == null && autocorrect) {
    return null;
  }

  switch (scope) {
    case null:
      if (autocorrect) {
        switch (filter) {
          case null:
            return null;
          case "songs":
          case "videos":
          case "albums":
          case "artists":
          case "playlists":
            return `EgWKAQI${_get_param2(filter)}AWoMEAMQBBAJEA4QChAF`;
          case "featured_playlists":
          case "community_playlists":
            return `EgeKAQQoA${_get_param2(filter)}BagwQAxAEEAkQDhAKEAU%3D`;
        }
      } else {
        switch (filter) {
          case null:
            return "QgIIAQ%3D%3D";
          case "songs":
          case "videos":
          case "albums":
          case "artists":
          case "playlists":
            return `EgWKAQI${_get_param2(filter)}AWoIEAMQBBAJEAo%3D`;
          case "featured_playlists":
            return `EgeKAQQoA${_get_param2(filter)}BaggQAxAEEAkQCg%3D%3D`;
        }
      }
      break;
    case "library":
      switch (filter) {
        case "artists":
        case "albums":
        case "songs":
          // note that `videos` is not supported here
          return `EgWKAQI${_get_param2(filter)}AWoIEAUQCRADGAQ%3D`;
        case "playlists":
          return "EgWKAQIoAWoEEAoYBA%3D%3D";
        default:
          return "agIYBA%3D%3D";
      }
      break;
    case "uploads":
      return "agIYAw%3D%3D";
  }
}

export function _get_param2(filter: Filter) {
  switch (filter) {
    case "songs":
      return "I";
    case "videos":
      return "Q";
    case "albums":
      return "Y";
    case "artists":
      return "g";
    case "playlists":
      return "o";
    case "featured_playlists":
      return "Dg";
    case "community_playlists":
      return "EA";
    default:
      throw Error("Invalid filter: " + filter);
  }
}
