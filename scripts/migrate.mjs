// 빌드 전에 Neon 스키마를 최신으로 맞춘다. DATABASE_URL이 없으면(로컬 전용 배포) 건너뛴다.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL 없음: 기기 로컬 저장 모드로 빌드합니다.");
  process.exit(0);
}

await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
console.log("[migrate] 완료");
