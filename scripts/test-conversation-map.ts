import { Logger } from "@/lib/logger";
import { generateNodeContent } from "@/features/generators/node-content";

// Create a logger instance for testing
const logger = new Logger({ context: "TestConversationMap" });

/**
 * Test script to verify that the conversation map visualization is working correctly
 * This script tests the node content generation functionality
 */
async function testConversationMap() {
  logger.info("Starting conversation map visualization test");

  // Test user message content generation
  const userMessageText = "Can you explain how neural networks work?";
  logger.info("Testing user message content generation");
  try {
    const userContent = await generateNodeContent({
      text: userMessageText,
      isUser: true,
      subject: "Machine Learning",
      moduleTitle: "Neural Networks Fundamentals",
    });

    logger.info("User message content generated successfully:");
    console.log({
      summary: userContent.summary,
      takeaways: userContent.takeaways,
    });
  } catch (error) {
    logger.error("Failed to generate user message content:", error);
  }

  // Test AI response content generation
  const aiResponseText = `
    Neural networks are computational models inspired by the human brain. They consist of layers of interconnected nodes (neurons) that process information.
    
    The basic structure includes:
    1. Input layer: Receives the initial data
    2. Hidden layers: Process the information
    3. Output layer: Provides the final result
    
    Each connection between neurons has a weight that adjusts during training. The network learns by adjusting these weights based on the error between predicted and actual outputs.
    
    Key concepts include:
    - Activation functions (like ReLU, sigmoid)
    - Backpropagation for training
    - Loss functions to measure error
    - Gradient descent for optimization
  `;

  logger.info("Testing AI response content generation");
  try {
    const aiContent = await generateNodeContent({
      text: aiResponseText,
      isUser: false,
      subject: "Machine Learning",
      moduleTitle: "Neural Networks Fundamentals",
    });

    logger.info("AI response content generated successfully:");
    console.log({
      summary: aiContent.summary,
      takeaways: aiContent.takeaways,
    });
  } catch (error) {
    logger.error("Failed to generate AI response content:", error);
  }

  logger.info("Conversation map visualization test completed");
}

// Run the test
testConversationMap().catch((error) => {
  logger.error("Test failed with error:", error);
  process.exit(1);
});
