/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
export interface LoggerOptions {
  // Optional context to prefix all log messages (e.g., a component name)
  context?: string;

  // Whether to enable logging (defaults true)
  enabled?: boolean;
}

export class Logger {
  private context?: string;
  private enabled?: boolean;

  constructor(options: LoggerOptions) {
    this.context = options.context;
    this.enabled = options.enabled ?? true;
  }

  private shouldLog(): boolean {
    return this.enabled ?? true;
  }

  private getStyledLog(level: string, message: string): [string, string, string] {
    const baseStyle = "font-weight: bold; padding: 2px 4px; border-radius: 2px;";

    let levelStyle: string;
    switch (level) {
      case "debug":
        // Grayish for debug
        levelStyle = "background: #e0e0e0; color: #000;";
        break;
      case "info":
        // Greenish for info
        levelStyle = "background: #dff0d8; color: #3c763d;";
        break;
      case "warn":
        // Orange-ish for warnings
        levelStyle = "background: #fcf8e3; color: #8a6d3b;";
        break;
      case "error":
        // Reddish for errors
        levelStyle = "background: #f2dede; color: #a94442;";
        break;
      default:
        levelStyle = "";
    }

    const label = `[${level.toUpperCase()}]${this.context ? ` [${this.context}]` : ""}`;
    const formattedLabel = `%c${label}%c ${message}`;
    const style1 = baseStyle + levelStyle; // style for the label
    const style2 = ""; // reset style for the actual message
    return [formattedLabel, style1, style2];
  }

  debug(message: string, ...args: any[]) {
    if (!this.shouldLog()) return;
    const [formattedLabel, style1, style2] = this.getStyledLog("debug", message);
    console.debug(formattedLabel, style1, style2, ...args);
  }

  info(message: string, ...args: any[]) {
    if (!this.shouldLog()) return;
    const [formattedLabel, style1, style2] = this.getStyledLog("info", message);
    console.info(formattedLabel, style1, style2, ...args);
  }

  warn(message: string, ...args: any[]) {
    if (!this.shouldLog()) return;
    const [formattedLabel, style1, style2] = this.getStyledLog("warn", message);
    console.warn(formattedLabel, style1, style2, ...args);
  }

  error(message: string, ...args: any[]) {
    // Always using the same shouldLog logic for consistency.
    if (!this.shouldLog()) return;
    const [formattedLabel, style1, style2] = this.getStyledLog("error", message);
    console.error(formattedLabel, style1, style2, ...args);
  }

  /**
   * - Accepts a log level that determines the styling for the group header.
   * - Styles the group header using getStyledLog so that it appears with the same styling as individual logs.
   * - Emits an initial log message inside the group so that if inner logs are filtered out in the console,
   *   there's always at least one visible entry.
   *
   * @param label - The group label.
   * @param logs - A callback that executes all logs inside the group.
   * @param collapsed - Whether the group should start collapsed (default: true).
   * @param level - The logging level to use for the group header (default: "info"). Options: "debug", "info", "warn", "error".
   */
  group(
    label: string,
    logs: () => void,
    collapsed: boolean = true,
    level: "debug" | "info" | "warn" | "error" = "info"
  ) {
    if (!this.shouldLog()) return;

    const [formattedLabel, style1, style2] = this.getStyledLog(level, label);

    if (collapsed) {
      console.groupCollapsed(formattedLabel, style1, style2);
    } else {
      console.group(formattedLabel, style1, style2);
    }

    // Emit the header inside the group so there's always at least one visible log.
    switch (level) {
      case "debug":
        console.debug(formattedLabel, style1, style2);
        break;
      case "warn":
        console.warn(formattedLabel, style1, style2);
        break;
      case "error":
        console.error(formattedLabel, style1, style2);
        break;
      default:
        console.info(formattedLabel, style1, style2);
    }

    logs();
    console.groupEnd();
  }
}
