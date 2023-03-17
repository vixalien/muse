import { get_continuations } from "../continuations.ts";
import { NAVIGATION_BROWSE_ID, TAB_CONTENT, TEXT_RUN_TEXT } from "../nav.ts";
import { validate_playlist_id } from "../parsers/playlists.ts";
import { get_tab_browse_id, parse_queue_playlist } from "../parsers/queue.ts";
import { j, jo } from "../util.ts";
import { request_json } from "./_request.ts";

export interface QueueOptions {
  limit?: number;
  continuation?: string;
  radio?: boolean;
  shuffle?: boolean;
  autoplay?: boolean;
  params?: string;
}

export async function get_queue(
  videoId: string | null,
  playlistId?: string | null,
  options: QueueOptions = {},
) {
  const {
    limit = 10,
    continuation: _continuation = null,
    radio = false,
    shuffle = false,
    autoplay = false,
    params,
  } = options;

  let continuation = _continuation as any;

  const endpoint = "next";

  const data = {
    enablePersistentPlaylistPanel: true,
    isAudioOnly: true,
    tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
    params: params ?? undefined,
  } as any;

  if (!videoId && !playlistId) {
    throw new Error("Must provide videoId or playlistId or both");
  }

  if (videoId != null) {
    data.videoId = videoId;

    if (!playlistId) {
      playlistId = "RDAMVM" + videoId;
    }

    if (!(radio || shuffle)) {
      data.watchEndpointMusicSupportedConfigs = {
        watchEndpointMusicConfig: {
          musicVideoType: "MUSIC_VIDEO_TYPE_ATV",
          hasPersistentPlaylistPanel: true,
        },
      };
    }
  }

  data.playlistId = playlistId ? validate_playlist_id(playlistId) : undefined;

  if (videoId && playlistId) {
    data.params = "8gEAmgMDCNgE";
  }

  if (shuffle && playlistId) {
    data.params = "wAEB8gECKAE%3D";
  }

  if (radio) {
    data.params = "wAEB";
  }

  if (autoplay) {
    if (!params) {
      // if (videoId) {
      //   data.params = "OAHyAQQIAXgB";
      if (data.playlistId.startsWith("RDAT")) {
        data.params = "8gECeAE%3D";
      } else {
        data.params = "wAEB8gECeAE%3D";
      }
    }

    // RDAMPL is for the radio of any playlist
    // RDAT is for a specific radio of a playlist (All, R&B, Familiar etc...)
    if (
      !data.playlistId.startsWith("RDAMPL") &&
      !data.playlistId.startsWith("RDAT")
    ) {
      data.playlistId = "RDAMPL" + data.playlistId;
    }
  }

  const is_playlist = data.playlistId.match(/^(PL|OLA|RD)/) ? true : false;

  const queue: any = {
    chips: [],
    playlist: null,
    playlistId: null,
    tracks: [],
  };

  if (!continuation) {
    const json = await request_json(endpoint, { data });

    const watchNextRenderer = j(
      json,
      "contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer",
    );

    queue.lyrics = get_tab_browse_id(watchNextRenderer, 1);
    queue.related = get_tab_browse_id(watchNextRenderer, 2);

    const renderer = j(
      watchNextRenderer,
      TAB_CONTENT,
      "musicQueueRenderer",
    );

    const results = j(
      renderer,
      "content.playlistPanelRenderer",
    );

    queue.playlist = jo(results, "title");
    queue.playlistId = jo(results, "playlistId");

    queue.author = {
      name: jo(results, "longBylineText.runs[0].text"),
      browseId: jo(results, "longBylineText.runs[0]", NAVIGATION_BROWSE_ID),
    };

    queue.tracks.push(...parse_queue_playlist(results.contents));

    const chipRenderers = jo(
      renderer,
      "subHeaderChipCloud.chipCloudRenderer.chips",
    );

    if (chipRenderers) {
      for (const chip of chipRenderers) {
        const endpoint = j(
          chip,
          "chipCloudChipRenderer.navigationEndpoint.queueUpdateCommand.fetchContentsCommand.watchEndpoint",
        );

        const data = {
          text: j(chip, "chipCloudChipRenderer", TEXT_RUN_TEXT),
          playlistId: endpoint.playlistId,
          params: endpoint.params,
        };

        queue.chips.push(data);
      }
    }

    if ("continuations" in results) {
      continuation = results;
    }
  }

  if (continuation) {
    const continued_data = await get_continuations(
      continuation,
      "playlistPanelContinuation",
      limit - queue.tracks.length,
      async (params) => {
        const response = await request_json(endpoint, { data, params });

        if (!("continuationContents" in response)) {
          const data = jo(
            response,
            "contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer",
            TAB_CONTENT,
            "musicQueueRenderer",
            "content.playlistPanelRenderer",
          );

          if (data) {
            return {
              continuationContents: {
                playlistPanelContinuation: data,
              },
            };
          }
        } else {
          return response;
        }
      },
      (contents) => {
        return parse_queue_playlist(contents);
      },
      is_playlist ? "Radio" : "",
    );

    queue.tracks.push(...continued_data.items);
    continuation = continued_data.continuation;
  }

  return {
    ...queue,
    continuation: typeof continuation === "string" ? continuation : null,
  };
}
