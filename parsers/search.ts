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

const FILTERED_PARAM1 = "EgWKAQI";

export function get_search_params(
  filter: Filter | undefined,
  scope: Scope | undefined,
  ignore_spelling: boolean,
) {
  let params = null, param1 = null, param2 = null, param3 = null;

  if (filter == null && scope == null && !ignore_spelling) {
    return params;
  }

  switch (scope) {
    case "uploads":
      params = "agIYAw%3D%3D";
      break;

    case "library":
      if (filter) {
        param1 = FILTERED_PARAM1;
        param2 = _get_param2(filter);
        param3 = "AWoKEAUQCRADEAoYBA%3D%3D";
      } else {
        params = "agIYBA%3D%3D";
      }
      break;

    case null:
    case undefined:
      if (filter) {
        switch (filter) {
          case "playlists":
            params = "Eg-KAQwIABAAGAAgACgB";
            if (ignore_spelling) {
              params += "MABqChAEEAMQCRAFEAo%3D";
            } else {
              params += "MABCAggBagoQBBADEAkQBRAK";
            }
            break;

          case "community_playlists":
          case "featured_playlists":
            param1 = "EgeKAQQoA";
            if (filter == "featured_playlists") {
              param2 = "Dg";
            } else {
              param2 = "EA";
            }

            if (!ignore_spelling) {
              param3 = "BagwQDhAKEAMQBBAJEAU%3D";
            } else {
              param3 = "BQgIIAWoMEA4QChADEAQQCRAF";
            }
            break;

          default:
            param1 = FILTERED_PARAM1;
            param2 = _get_param2(filter);

            if (!ignore_spelling) {
              param3 = "AWoMEA4QChADEAQQCRAF";
            } else {
              param3 = "AUICCAFqDBAOEAoQAxAEEAkQBQ%3D%3D";
            }
            break;
        }
      } else if (ignore_spelling) {
        params = "EhGKAQ4IARABGAEgASgAOAFAAUICCAE%3D";
      }
      break;
  }

  return params ?? `${param1}${param2}${param3}`;
}

const filter_param_map = new Map([
  ["songs", "I"],
  ["videos", "Q"],
  ["albums", "Y"],
  ["artists", "g"],
  ["playlists", "o"],
]);

export function _get_param2(filter: Filter) {
  return filter_param_map.get(filter);
}
