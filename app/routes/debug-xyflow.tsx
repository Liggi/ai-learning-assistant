import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ReactFlow, useNodesInitialized, useStore } from "@xyflow/react";

const nodes = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Default node" },
  },
];
const edges = [];

function DebugPanel() {
  const inited = useNodesInitialized();
  const store = useStore((s) => s);

  React.useEffect(() => {
    console.log("useNodesInitialized:", inited);
    console.log("React Flow store:", store);
    console.log("Store keys:", Object.keys({ ...store }));
    console.log("Store JSON:", JSON.stringify(store));
  }, [inited, store]);

  return (
    <div style={{ padding: 16, background: "#222", color: "#fff" }}>
      <div>nodesInitialized: {String(inited)}</div>
      <div>Store keys: {Object.keys({ ...store }).join(", ")}</div>
      <pre style={{ maxWidth: 600, overflow: "auto" }}>
        {JSON.stringify(store, null, 2)}
      </pre>
    </div>
  );
}

function DebugXYFlowRoute() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={nodes} edges={edges}>
        <DebugPanel />
      </ReactFlow>
    </div>
  );
}

export const Route = createFileRoute("/debug-xyflow")({
  component: DebugXYFlowRoute,
});
