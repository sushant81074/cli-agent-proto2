import type { ILLMProvider, TModelRequest, TStreamEvent } from "../types.ts";

export class ReplayProvider implements ILLMProvider {
  constructor(private readonly events: TStreamEvent[]) {}

  async *complete(_request: TModelRequest): AsyncIterable<TStreamEvent> {
    for (const event of this.events) {
      yield event;
    }
  }
}
