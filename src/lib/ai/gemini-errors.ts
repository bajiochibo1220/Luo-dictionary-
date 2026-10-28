export class AiProviderError extends Error {
  constructor(public status: number, message: string, public providerStatus?: number) { super(message); }
}
