import * as fs from "node:fs";
import { SpanKind, type SpanStatusCode, trace } from "@opentelemetry/api";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

// Server-side imports (will be tree-shaken on client)
let NodeSDK: any;
let getNodeAutoInstrumentations: any;
let _ConsoleSpanExporter: any;

// File exporter for server-side traces
class FileSpanExporter {
  export(spans: any[], resultCallback: any) {
    try {
      const timestamp = new Date().toISOString();
      const traceData = {
        timestamp,
        spans: spans.map((span) => ({
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          name: span.name,
          kind: span.kind,
          startTime: span.startTime,
          endTime: span.endTime,
          attributes: span.attributes,
          events: span.events,
          status: span.status,
        })),
      };

      fs.appendFileSync("./traces.json", `${JSON.stringify(traceData, null, 2)}\n`);
      resultCallback({ code: 0 });
    } catch (error) {
      resultCallback({ code: 1, error });
    }
  }

  shutdown() {
    return Promise.resolve();
  }
}

// Client-side imports (will be tree-shaken on server)
let WebTracerProvider: any;
let SimpleSpanProcessor: any;
let _BatchSpanProcessor: any;
let Resource: any;

// Client-side console exporter that's easy to copy
class ClientTraceExporter {
  export(spans: any[], resultCallback: any) {
    try {
      const timestamp = new Date().toISOString();
      const _traceData = {
        timestamp,
        source: "client",
        spans: spans.map((span) => ({
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          name: span.name,
          kind: span.kind,
          startTime: span.startTime,
          endTime: span.endTime,
          attributes: span.attributes,
          events: span.events,
          status: span.status,
        })),
      };

      resultCallback({ code: 0 });
    } catch (error) {
      resultCallback({ code: 1, error });
    }
  }

  shutdown() {
    return Promise.resolve();
  }
}

// Lazy load server dependencies
async function loadServerDependencies() {
  if (typeof window === "undefined") {
    const nodeModule = await import("@opentelemetry/sdk-node");
    const autoInstrumentationsModule = await import("@opentelemetry/auto-instrumentations-node");
    const traceModule = await import("@opentelemetry/sdk-trace-base");

    NodeSDK = nodeModule.NodeSDK;
    getNodeAutoInstrumentations = autoInstrumentationsModule.getNodeAutoInstrumentations;
    _ConsoleSpanExporter = traceModule.ConsoleSpanExporter;
  }
}

// Lazy load client dependencies
async function loadClientDependencies() {
  if (typeof window !== "undefined") {
    const webModule = await import("@opentelemetry/sdk-trace-web");
    const resourceModule = await import("@opentelemetry/resources");

    WebTracerProvider = webModule.WebTracerProvider;
    SimpleSpanProcessor = webModule.SimpleSpanProcessor;
    _BatchSpanProcessor = webModule.BatchSpanProcessor;
    Resource = resourceModule.resourceFromAttributes;
    _ConsoleSpanExporter = webModule.ConsoleSpanExporter;
  }
}

// Initialize server-side telemetry
export async function initializeServerTelemetry() {
  if (typeof window !== "undefined") {
    return;
  }

  await loadServerDependencies();

  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy instrumentations
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
    //traceExporter: new FileSpanExporter(), // Use file exporter for now
  });

  sdk.start();
  return sdk;
}

// Initialize client-side telemetry
export async function initializeClientTelemetry() {
  if (typeof window === "undefined") {
    return;
  }

  await loadClientDependencies();

  // Create the span processor with client trace exporter
  const processor = new SimpleSpanProcessor(new ClientTraceExporter());

  const provider = new WebTracerProvider({
    resource: Resource({
      [ATTR_SERVICE_NAME]: "learning-assistant-frontend",
      [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
    spanProcessors: [processor],
  });

  provider.register();
  return provider;
}

// Universal telemetry initialization
export async function initializeTelemetry() {
  if (typeof window === "undefined") {
    return initializeServerTelemetry();
  } else {
    return initializeClientTelemetry();
  }
}

// Create custom spans for business logic
export function createSpan(name: string, attributes?: Record<string, any>) {
  const tracer = trace.getTracer("learning-assistant");
  const span = tracer.startSpan(name, {
    kind: SpanKind.INTERNAL,
    attributes,
  });

  return {
    span,
    setAttributes: (attrs: Record<string, any>) => span.setAttributes(attrs),
    addEvent: (name: string, attrs?: Record<string, any>) => span.addEvent(name, attrs),
    setStatus: (code: SpanStatusCode, message?: string) => span.setStatus({ code, message }),
    end: () => span.end(),
  };
}
