/**
 * 기기 로컬 저장소 추상화. 지금은 localStorage를 쓰고,
 * 데이터가 커지면 같은 인터페이스로 IndexedDB 구현을 끼우면 된다.
 */
export interface KeyValueStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export class MemoryKV implements KeyValueStore {
  private readonly data = new Map<string, string>();
  get<T>(key: string): T | undefined {
    const raw = this.data.get(key);
    return raw === undefined ? undefined : (JSON.parse(raw) as T);
  }
  set<T>(key: string, value: T): void {
    this.data.set(key, JSON.stringify(value));
  }
  remove(key: string): void {
    this.data.delete(key);
  }
}

export class LocalStorageKV implements KeyValueStore {
  constructor(private readonly prefix: string) {}

  private k(key: string) {
    return `${this.prefix}:${key}`;
  }

  get<T>(key: string): T | undefined {
    try {
      const raw = window.localStorage.getItem(this.k(key));
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  }

  set<T>(key: string, value: T): void {
    window.localStorage.setItem(this.k(key), JSON.stringify(value));
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(this.k(key));
    } catch {
      // 저장소 접근이 막힌 환경(시크릿 모드 등)은 무시
    }
  }
}

/** localStorage를 못 쓰는 환경이면 메모리로 대체(새로고침 시 사라짐) */
export function createBrowserKV(prefix: string): KeyValueStore {
  try {
    const probe = `${prefix}:__probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return new LocalStorageKV(prefix);
  } catch {
    return new MemoryKV();
  }
}
