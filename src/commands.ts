import { encodeCommand, type FoldAction } from './shared/protocol';

/** How long a command stays in the rendered HTML. Covers the preview's update delay. */
export const COMMAND_TTL_MS = 1500;

export interface CommandChannelDeps {
  /** Asks every open preview to render again. */
  readonly refresh: () => PromiseLike<unknown>;
  readonly createId: () => string;
}

// Holds the latest bulk command until previews have rendered it.
export class CommandChannel {
  private value: string | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly deps: CommandChannelDeps) {}

  /** The encoded command for the marker, or undefined when there is none. */
  get current(): string | undefined {
    return this.value;
  }

  async send(action: FoldAction): Promise<void> {
    this.value = encodeCommand({ action, id: this.deps.createId() });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.value = undefined;
    }, COMMAND_TTL_MS);
    await this.deps.refresh();
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.value = undefined;
  }
}
