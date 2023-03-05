// commonly used navigation paths
export const CONTENT = "contents[0]";
export const RUN_TEXT = "runs[0].text";
export const TAB_CONTENT = "tabs[0].tabRenderer.content";
export const TAB_1_CONTENT = "tabs[1].tabRenderer.content";
export const SINGLE_COLUMN = "contents.singleColumnBrowseResultsRenderer";
export const SINGLE_COLUMN_TAB = `${SINGLE_COLUMN}.${TAB_CONTENT}`;
export const SECTION_LIST = "sectionListRenderer.contents";
export const SECTION_LIST_ITEM = `sectionListRenderer.${CONTENT}`;
export const ITEM_SECTION = `itemSectionRenderer.${CONTENT}`;
export const MUSIC_SHELF = "musicShelfRenderer";
export const GRID = "gridRenderer";
export const GRID_ITEMS = `${GRID}.items`;
export const MENU = "menu.menuRenderer";
export const MENU_ITEMS = `${MENU}.items`;
export const MENU_LIKE_STATUS =
  `${MENU}.topLevelButtons[0].likeButtonRenderer.likeStatus`;
export const MENU_SERVICE = "menuServiceItemRenderer.serviceEndpoint";
export const TOGGLE_MENU = "toggleMenuServiceItemRenderer";
export const MORE_BUTTON = "moreContentButton.buttonRenderer";
export const PLAY_BUTTON =
  "overlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer";
export const NAVIGATION_BROWSE = "navigationEndpoint.browseEndpoint";
export const NAVIGATION_BROWSE_ID = `${NAVIGATION_BROWSE}.browseId`;
export const PAGE_TYPE =
  "browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType";
export const NAVIGATION_VIDEO_ID = "navigationEndpoint.watchEndpoint.videoId";
export const NAVIGATION_PLAYLIST_ID =
  "navigationEndpoint.watchEndpoint.playlistId";
export const NAVIGATION_WATCH_PLAYLIST_ID =
  "navigationEndpoint.watchPlaylistEndpoint.playlistId";
export const NAVIGATION_VIDEO_TYPE =
  "watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType";
export const HEADER_DETAIL = "header.musicDetailHeaderRenderer";
export const DESCRIPTION_SHELF = "musicDescriptionShelfRenderer";
export const DESCRIPTION = `description.${RUN_TEXT}`;
export const CAROUSEL = "musicCarouselShelfRenderer";
export const IMMERSIVE_CAROUSEL = "musicImmersiveCarouselShelfRenderer";
export const CAROUSEL_CONTENTS = `${CAROUSEL}.contents`;
export const CAROUSEL_CONTAINER =
  "header.musicCarouselShelfBasicHeaderRenderer";
export const CAROUSEL_TITLE = `${CAROUSEL_CONTAINER}.title.runs[0]`;
export const FRAMEWORK_MUTATIONS =
  "frameworkUpdates.entityBatchUpdate.mutations";
export const TITLE = "title.runs[0]";
export const TITLE_TEXT = `title.${RUN_TEXT}`;
export const TEXT_RUNS = "text.runs";
export const TEXT_RUN = `${TEXT_RUNS}[0]`;
export const TEXT_RUN_TEXT = `${TEXT_RUN}.text`;
export const SUBTITLE = `subtitle.${RUN_TEXT}`;
export const SUBTITLE2 = "subtitle.runs[2].text";
export const SUBTITLE3 = "subtitle.runs[4].text";
export const THUMBNAIL = "thumbnail.thumbnails";
export const THUMBNAILS = `thumbnail.musicThumbnailRenderer.${THUMBNAIL}`;
export const THUMBNAIL_RENDERER =
  `thumbnailRenderer.musicThumbnailRenderer.${THUMBNAIL}`;
export const THUMBNAIL_CROPPED =
  `thumbnail.croppedSquareThumbnailRenderer.${THUMBNAIL}`;
export const FEEDBACK_TOKEN = "feedbackEndpoint.feedbackToken";
export const BADGE_PATH =
  "0.musicInlineBadgeRenderer.accessibilityData.accessibilityData.label";
export const BADGE_LABEL = `badges.${BADGE_PATH}`;
export const SUBTITLE_BADGE_LABEL = `subtitleBadges.${BADGE_PATH}`;
export const CATEGORY_TITLE = "musicNavigationButtonRenderer.buttonText.runs";
export const CATEGORY_PARAMS =
  "musicNavigationButtonRenderer.clickCommand.browseEndpoint.params";
export const MRLIR = "musicResponsiveListItemRenderer";
export const MTRIR = "musicTwoRowItemRenderer";
export const MTCIR = "musicTwoColumnItemRenderer";
export const TASTE_PROFILE_ITEMS = `contents.tastebuilderRenderer.contents`;
export const TASTE_PROFILE_ARTIST = `title.runs`;
export const SECTION_LIST_CONTINUATION =
  `continuationContents.sectionListContinuation`;
export const MENU_PLAYLIST_ID =
  `${MENU_ITEMS}.0.menuNavigationItemRenderer.${NAVIGATION_WATCH_PLAYLIST_ID}`;

interface ObjectWithNested {
  [key: string]: any;
  [key: number]: any;
}

type ObjectList = Array<{ [key: string]: any } | ObjectWithNested>;

export function find_object_by_key(
  objectList: ObjectList,
  key: string,
  nested?: string,
  isKey = false,
): { [key: string]: any } | null {
  for (const item of objectList) {
    const obj: ObjectWithNested = nested ? item[nested] : item;
    if (key in obj) {
      return isKey ? obj[key] : obj;
    }
  }
  return null;
}
