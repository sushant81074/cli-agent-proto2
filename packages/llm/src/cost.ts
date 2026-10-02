import type { TUsage } from "./types.ts";

export type TModelUsage = {
  usage: TUsage;
  latencyMs: number;
};

export function createModelUsage(usage: TUsage, latencyMs: number): TModelUsage {
  return {
    usage,
    latencyMs,
  };
}
