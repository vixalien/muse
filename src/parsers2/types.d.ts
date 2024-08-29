export type RawJSON = any;

export type Parser<T> = (content: RawJSON) => T;
