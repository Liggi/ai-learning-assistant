import React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesInitialized,
  useStore,
} from "@xyflow/react";

const nodes = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Default node" },
  },
];
const edges = [];

export default function PersonalLearningMapFlow() {
  const inited = useNodesInitialized();
  const store = useStore((s) => s);

  React.useEffect(() => {
    console.log("useNodesInitialized:", inited);
    console.log("React Flow store:", store);
    console.log("Store keys:", Object.keys(store));
  }, [inited, store]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={nodes} edges={edges}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
