export abstract class Store {
  version = "muse-1";
  abstract get<T>(key: string): T | null;
  abstract set(key: string, value: unknown): void;
  abstract delete(key: string): void;
  // set(key: string, value: unknown): void {
  //   this._set(key, value);
  // }
  // get<T>(key: string): T | null {
  //   const value = this._get(key);
  //   if (value == null) return null;
  //   return JSON.parse(value) as T;
  // }
}

export class DenoFileStore extends Store {
  map: Map<string, unknown> = new Map();

  constructor(private path: string) {
    super();
    // Load the file if it exists
    try {
      // dnt-shim-ignore
      const content = Deno.readTextFileSync(path);

      const json = JSON.parse(content);

      if (json.version !== this.version) {
        throw "";
      } else {
        this.map = new Map(Object.entries(json));
      }
    } catch (_error) {
      this.map = new Map();
      this.set("version", this.version);
    }
  }

  get<T>(key: string): T | null {
    return this.map.get(key) as T ?? null;
  }

  set(key: string, value: unknown): void {
    this.map.set(key, value);

    this.save();
  }

  delete(key: string): void {
    this.map.delete(key);

    this.save();
  }

  private save() {
    const json = JSON.stringify(Object.fromEntries(this.map), null, 2);

    // dnt-shim-ignore
    Deno.writeTextFileSync(this.path, json);
  }
}

export class MemoryStore extends Store {
  map: Map<string, unknown> = new Map([["version", this.version]]);

  get<T>(key: string): T | null {
    return this.map.get(key) as T ?? null;
  }

  set(key: string, value: unknown): void {
    this.map.set(key, value);
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

export class LocalStorageStore extends Store {
  map: Map<string, unknown> = new Map();

  constructor(public name = "muse-store") {
    super();

    const data = localStorage.getItem(this.name);
    let json: Record<string, string> | null = null;

    try {
      json = JSON.parse(data ?? "");
    } catch (_error) {
      // Ignore
    }

    if (json && json.version === this.version) {
      this.map = new Map(Object.entries(json));
    } else {
      this.map = new Map();
      this.set("version", this.version);
    }
  }

  get<T>(key: string): T | null {
    return this.map.get(key) as T ?? null;
  }

  set(key: string, value: unknown): void {
    this.map.set(key, value);

    this.save();
  }

  delete(key: string): void {
    this.map.delete(key);

    this.save();
  }

  private save() {
    const json = JSON.stringify(Object.fromEntries(this.map), null, 2);

    localStorage.setItem(this.name, json);
  }
}

export const get_default_store = (): Store => {
  // dnt-shim-ignore
  if ("Deno" in globalThis) {
    return new DenoFileStore("muse-store.json");
    // dnt-shim-ignore
  } else if ("localStorage" in globalThis) {
    return new LocalStorageStore();
  } else {
    return new MemoryStore();
  }
};
