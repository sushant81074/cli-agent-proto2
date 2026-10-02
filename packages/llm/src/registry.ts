import type { ILLMProvider } from "./types.ts";

export class ProviderRegistry {
    private readonly providers = new Map<string, ILLMProvider>();

    register(name: string, provider: ILLMProvider): void {
        this.providers.set(name, provider);
    }

    get(name: string): ILLMProvider {
        const provider = this.providers.get(name);
        if (!provider) throw new Error(`Unknown LLM provider: ${name}`);
        return provider;
    }

    static create(): ProviderRegistry {
        const registry = new ProviderRegistry();
        return registry;
    }
}