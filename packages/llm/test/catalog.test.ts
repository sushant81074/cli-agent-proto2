import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelCatalog } from "../src/catalog.ts";

describe("catalog", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }

    vi.restoreAllMocks();
  });

  it("fetches models and writes the cache when no cache exists", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agentic-catalog-"));

    const cachePath = join(tempDir, "models.json");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "test/model",
                context_length: 100000,
                max_completion_tokens: 4096,
                supported_parameters: ["tools"],
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                },
                pricing: {
                  prompt: "0.000001",
                  completion: "0.000002",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );

    const catalog = new ModelCatalog(
      "test-key",
      "https://openrouter.test/api/v1",
      cachePath,
      60_000,
    );

    const models = await catalog.getModels();

    expect(models).toEqual([
      {
        id: "test/model",
        contextLength: 100000,
        maxCompletionTokens: 4096,
        supportedParameters: ["tools"],
        inputModalities: ["text"],
        outputModalities: ["text"],
        pricing: {
          prompt: 0.000001,
          completion: 0.000002,
        },
      },
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);

    const cache = JSON.parse(await readFile(cachePath, "utf8"));

    expect(cache.models).toEqual(models);
    expect(cache.fetchedAt).toEqual(expect.any(Number));
  });

  it("returns valid cached models without fetching", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agentic-catalog-"));

    const cachePath = join(tempDir, "models.json");

    const cachedModels = [
      {
        id: "cached/model",
        contextLength: 50000,
        supportedParameters: [],
        inputModalities: ["text"],
        outputModalities: ["text"],
        pricing: {
          prompt: 1,
          completion: 2,
        },
      },
    ];

    await writeFile(
      cachePath,
      JSON.stringify({
        fetchedAt: Date.now(),
        models: cachedModels,
      }),
    );

    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const catalog = new ModelCatalog(
      "test-key",
      "https://openrouter.test/api/v1",
      cachePath,
      60_000,
    );

    const models = await catalog.getModels();

    expect(models).toEqual(cachedModels);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bypasses the cache when refresh is requested", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agentic-catalog-"));

    const cachePath = join(tempDir, "models.json");

    await writeFile(
      cachePath,
      JSON.stringify({
        fetchedAt: Date.now(),
        models: [
          {
            id: "old/model",
            contextLength: 1000,
            supportedParameters: [],
            inputModalities: ["text"],
            outputModalities: ["text"],
            pricing: {
              prompt: 1,
              completion: 2,
            },
          },
        ],
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "new/model",
                context_length: 2000,
                supported_parameters: [],
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                },
                pricing: {
                  prompt: "3",
                  completion: "4",
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const catalog = new ModelCatalog(
      "test-key",
      "https://openrouter.test/api/v1",
      cachePath,
      60_000,
    );

    const models = await catalog.getModels(undefined, true);

    expect(models[0]?.id).toBe("new/model");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
