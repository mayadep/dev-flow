import type { ContentPack, Question, QuestionRef, Topic } from "./types";

/**
 * 등록된 콘텐츠 팩들을 조회하는 읽기 전용 카탈로그.
 * 팩 추가/교체는 생성 시 넘기는 배열만 바꾸면 된다.
 */
export class ContentCatalog {
  private readonly topicsById = new Map<string, Topic>();
  private readonly questionsById = new Map<string, QuestionRef>();

  constructor(readonly packs: readonly ContentPack[]) {
    for (const pack of packs) {
      for (const topic of pack.topics) {
        if (this.topicsById.has(topic.id)) {
          throw new Error(`중복된 토픽 id: ${topic.id}`);
        }
        this.topicsById.set(topic.id, topic);
        for (const question of topic.questions) {
          if (this.questionsById.has(question.id)) {
            throw new Error(`중복된 문제 id: ${question.id}`);
          }
          this.questionsById.set(question.id, { topicId: topic.id, question });
        }
      }
    }
  }

  get topics(): Topic[] {
    return [...this.topicsById.values()];
  }

  topic(id: string): Topic | undefined {
    return this.topicsById.get(id);
  }

  question(id: string): QuestionRef | undefined {
    return this.questionsById.get(id);
  }

  /** topicIds가 비어 있으면 전체 토픽 */
  pool(topicIds: readonly string[] = []): QuestionRef[] {
    const topics = topicIds.length
      ? topicIds.map((id) => this.topicsById.get(id)).filter((t): t is Topic => !!t)
      : this.topics;
    return topics.flatMap((t) =>
      t.questions.map((question: Question) => ({ topicId: t.id, question })),
    );
  }
}
