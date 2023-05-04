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
  const get_params = () =>
    reloadable
      ? get_reloadable_continuation_params(results)
      : get_continuation_params(results, _ctoken_path);

  const items = [];
  let params = get_params(), continuation = params.continuation;

  while (
    (typeof results === "string" || "continuations" in results) &&
    (limit == null || items.length < limit)
  ) {
    const response = await request(params);

    if ("continuationContents" in response) {
      results = response.continuationContents[continuation_type];
      params = get_params();

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

export async function get_validated_continuations(
  results: any,
  continuation_type: string,
  limit: number,
  per_page: number,
  request: (additional_params: Record<string, string>) => Promise<any>,
  parse: (data: any) => any[],
  _ctoken_path = "",
) {
  const get_params = () => get_continuation_params(results, _ctoken_path);

  const items = [];
  let params = get_params(), continuation = params.continuation;

  while (
    (typeof results === "string" || "continuations" in results) &&
    (limit == null || items.length < limit)
  ) {
    const response = await resend_request_until_valid(
      request,
      params,
      (response: any) =>
        get_parsed_continuation_items(response, parse, continuation_type),
      (parsed: any) => validate_response(parsed, per_page, limit, items.length),
    );

    params = get_params();

    continuation = params.continuation;

    results = response.results;

    items.push(...response.parsed);
  }

  return { items, continuation };
}

export function get_parsed_continuation_items(
  response: any,
  parse: (data: any) => any[],
  continuation_type: string,
) {
  const results = response.continuationContents[continuation_type];

  return {
    results,
    parsed: get_continuation_contents(results, parse),
  };
}

export function get_continuation_params(results: any, ctoken_path = "") {
  const ctoken = typeof results === "string" ? results : jo(
    results,
    `continuations[0].next${ctoken_path}ContinuationData.continuation`,
  );
  return get_continuation_object(ctoken);
}

export function get_reloadable_continuation_params(results: any) {
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
    type: "next",
  };
}

export function get_continuation_contents<T extends any = any>(
  continuation: any,
  parse: (data: any) => T[],
) {
  for (const term of ["contents", "items"]) {
    if (term in continuation) {
      return parse(continuation[term]);
    }
  }

  return [] as T[];
}

export async function resend_request_until_valid(
  request: (params: Record<string, string>) => Promise<any>,
  params: Record<string, string>,
  parse: (data: any) => any,
  validate: (data: any) => boolean,
  max_retries = 5,
) {
  const response = await request(params);
  let parsed_object = parse(response);

  let retries = 0;

  while (!validate(parsed_object) && retries < max_retries) {
    const response = await request(params);
    const attempt = parse(response);

    if (attempt.parsed.length > parsed_object.parsed.length) {
      parsed_object = attempt;
    }

    retries++;
  }

  return parsed_object;
}

export function validate_response(
  response: any,
  per_page: number,
  limit: number,
  current_count: number,
) {
  const remaining = limit - current_count;
  const expected = Math.min(remaining, per_page);

  // response is invalid, if it has less items then minimal expected count
  return response.parsed.length >= expected;
}
