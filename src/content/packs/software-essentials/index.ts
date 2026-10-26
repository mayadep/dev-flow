import type { ContentPack } from "@/core/content/types";
import { db } from "./db";
import { deploy } from "./deploy";
import { design } from "./design";
import { dsa } from "./dsa";
import { git } from "./git";
import { security } from "./security";
import { testing } from "./testing";
import { web } from "./web";

export const softwareEssentials: ContentPack = {
  id: "software-essentials",
  title: "소프트웨어 만들 때 필요한 것들",
  description: "버전 관리부터 배포·보안·설계까지 개발 전반의 기본기",
  version: 1,
  topics: [git, web, db, dsa, deploy, security, testing, design],
};
