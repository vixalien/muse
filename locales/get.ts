import { request_json } from "../mixins/_request.ts";

export async function get_locales() {
  const response = await request_json("account/get_setting", {});

  const i18n = response.items.find((category: any) =>
    category.settingCategoryCollectionRenderer.categoryId == "SETTING_CAT_I18N"
  );

  const get_items = (n: number) =>
    i18n.settingCategoryCollectionRenderer.items[n]
      .settingSingleOptionMenuRenderer.items.map((item: any) => {
        const data = item.settingMenuItemRenderer;

        return {
          name: data.name,
          value: data.value,
        };
      });

  const result = {
    locations: get_items(0),
    languages: get_items(1),
  };

  return result;
}

await get_locales()
  .then((result) => {
    Deno.writeTextFile("locales.json", JSON.stringify(result));
  });
