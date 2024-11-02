import { request_json } from "../../mixins/_request.ts";

import { RawJSON } from "../../parsers2/types.d.ts";
import { parse_single_column_browse_results_renderer } from "../../parsers2/tabs/mod.ts";
import { parse_background, Thumbnail } from "../../parsers2/thumbnail/mod.ts";
import { parse_mood_chips } from "../../parsers2/chips/mod.ts";
import { ParseMoodChipResult } from "../../parsers2/chips/mood.ts";
import { parse_section_list } from "../../parsers2/list/mod.ts";
import { parse_music_carousel_shelf_renderers } from "../../parsers2/music_carousel/mod.ts";
import { parse_music_two_row_item_renderer } from "../../parsers2/items/mod.ts";

export type MoodChip = ParseMoodChipResult;

export interface Home {
  moods: MoodChip[];
  thumbnails: Thumbnail[];
  continuation: string | null;
  content: RawJSON;
}

export async function get_home(): Promise<Home> {
  const json = await request_json("browse", {
    data: { browseId: "FEmusic_home" },
  });

  const background = parse_background(json);
  const tab = parse_single_column_browse_results_renderer(json.contents).tab;
  const section_list = parse_section_list(tab.content);
  const moods = parse_mood_chips(section_list.header);

  const contents = parse_music_carousel_shelf_renderers(section_list.contents)
    .map((content) => {
      return {
        ...content,
        contents: content.contents.map(parse_music_two_row_item_renderer),
      };
    });

  return {
    moods,
    thumbnails: background.thumbnails,
    continuation: section_list.nextContinuation,
    content: contents,
  };
}
