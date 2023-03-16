import { get_continuations } from "../continuations.ts";
import { NAVIGATION_PLAYLIST_ID, TAB_CONTENT, TEXT_RUN_TEXT } from "../nav.ts";
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
}

export async function get_queue(
  videoId: string | null,
  playlistId?: string | null,
  options: QueueOptions = {},
) {
  const {
    limit = 20,
    continuation: _continuation = null,
    radio = false,
    shuffle = false,
    autoplay = false,
  } = options;

  let continuation = _continuation as any;

  const endpoint = "next";

  const data = {
    enablePersistentPlaylistPanel: true,
    isAudioOnly: true,
    tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
  } as any;

  if (!videoId && !playlistId) {
    throw new Error("Must provide videoId or playlistId or both");
  }

  if (videoId != null && !autoplay) {
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

  const is_playlist = (data.playlistId?.startsWith("PL") ||
    data.playlistId?.startsWith("OLA")) ?? false;

  if (shuffle && playlistId) {
    data.params = "wAEB8gECKAE%3D";
  }

  if (radio) {
    data.params = "wAEB";
  }

  if (autoplay) {
    data.params = "wAEB8gECeAE%3D";
    data.playlistId = "RDAMPL" + data.playlistId;
  }

  const queue: any = { tracks: [], chips: [] };

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

    queue.playlistId = results.contents
      .map((x: any) =>
        jo(x, "playlistPanelVideoRenderer", NAVIGATION_PLAYLIST_ID)
      )
      .filter(Boolean)
      .shift();

    queue.tracks.push(...parse_queue_playlist(results.contents));

    const chipRenderers = jo(
      renderer,
      "subHeaderChipCloud.chipCloudRenderer.chips",
    );

    if (chipRenderers) {
      for (const chip of chipRenderers) {
        const data = {
          text: j(chip, "chipCloudChipRenderer", TEXT_RUN_TEXT),
          playlistId: j(
            chip,
            "chipCloudChipRenderer.navigationEndpoint.queueUpdateCommand.fetchContentsCommand.watchEndpoint.playlistId",
          ),
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
      (params) => {
        return request_json(endpoint, { data, params });
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
