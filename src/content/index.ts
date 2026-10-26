import { ContentCatalog } from "@/core/content/registry";
import type { ContentPack } from "@/core/content/types";
import { softwareEssentials } from "./packs/software-essentials";

/** 새 콘텐츠 팩은 여기에 추가하면 앱 전체에 반영된다. */
export const packs: readonly ContentPack[] = [softwareEssentials];

export const catalog = new ContentCatalog(packs);
