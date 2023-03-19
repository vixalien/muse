import {
  assert,
  assertEquals,
  describe,
  DescribeDefinition,
  it,
} from "./deps.ts";
import { assertThumbnails } from "./asserts.ts";

export type WithPlaylists = { playlists: any[] };

// test each playlist
export function describePlaylists(
  def: Omit<DescribeDefinition<WithPlaylists>, "name">,
) {
  describe<WithPlaylists>("playlists", {
    fn(this) {
      it("should have playlists", function (this: WithPlaylists) {
        assert(this.playlists);
        assert(this.playlists.length > 0);
      });

      it("each playlist should be valid", function (this: WithPlaylists) {
        this.playlists.forEach((playlist: any, n: number) => {
          const i = `playlist ${n + 1} `;

          assertEquals(playlist.type, "playlist", i);

          assertEquals(
            typeof playlist.title,
            "string",
            i + "title must be a string",
          );

          assert(
            playlist.title.length > 0,
            i + "title must not be blank",
          );

          assertEquals(
            typeof playlist.playlistId,
            "string",
            i + "playlistId must be a string",
          );

          if (playlist.playlistId.startsWith("RDCLA")) {
            assertEquals(
              playlist.playlistId.length,
              43,
              i + "playlistId must be 43 characters long",
            );

            assertEquals(
              playlist.playlistId.slice(0, 10),
              "RDCLAK5uy_",
              i + "playlistId must start with RDCLAK5uy_",
            );
          } else {
            // Radio
            assertEquals(
              playlist.playlistId.length,
              31,
              i + "playlistId must be 43 characters long",
            );

            assertEquals(
              playlist.playlistId.slice(0, 4),
              "RDAT",
              i + "playlistId must start with RDCLAK5uy_",
            );
          }

          assertThumbnails(
            playlist.thumbnails,
            // i + "thumbnails must be valid",
          );
        });
      });
    },
    ...def,
  });
}
