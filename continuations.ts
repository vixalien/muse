import { jo } from "./util.ts";

export async function get_continuations(
  results: any,
  continuation_type: string,
  limit: number | null,
  request: (additional_params: Record<string, string>) => Promise<any>,
  parse: (data: any) => any[],
  _ctoken_path = "",
  reloadable = false,
) {
  const items = [];
  let params = reloadable
      ? get_reloadable_params(results)
      : get_params(results, _ctoken_path),
    continuation = params.continuation;

  while (
    (typeof results === "string" || "continuations" in results) &&
    (limit == null || items.length < limit)
  ) {
    const response = await request(params);

    if ("continuationContents" in response) {
      results = response.continuationContents[continuation_type];
      params = reloadable
        ? get_reloadable_params(results)
        : get_params(results, _ctoken_path);

      continuation = params.continuation;
    } else {
      break;
    }

    const contents = get_continuation_contents(results, parse);

    if (contents.length == 0) break;

    items.push(...contents);
  }

  return { items, continuation };
}

function get_params(results: any, ctoken_path = "") {
  const ctoken = typeof results === "string" ? results : jo(
    results,
    `continuations[0].next${ctoken_path}ContinuationData.continuation`,
  );
  return get_continuation_object(ctoken);
}

function get_reloadable_params(results: any) {
  const ctoken = typeof results === "string" ? results : jo(
    results,
    `continuations[0].reloadContinuationData.continuation`,
  );
  return get_continuation_object(ctoken);
}

function get_continuation_object(ctoken: string) {
  return {
    ctoken,
    continuation: ctoken,
  };
}

function get_continuation_contents(
  continuation: any,
  parse: (data: any) => any[],
) {
  for (const term of ["contents", "items"]) {
    if (term in continuation) {
      return parse(continuation[term]);
    }
  }

  return [] as any[];
}
