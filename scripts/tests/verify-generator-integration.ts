import { generate as generateArticle } from "@/features/generators/lesson";
import { generate as generateTooltips } from "@/features/generators/tooltips";
import { generate as generateSuggestedQuestions } from "@/features/generators/suggested-questions";
import { extractBoldedSegments } from "@/utils/extractBolded";

async function main() {
  console.log("Starting generator integration verification...");

  // Test data
  const subject = "Computer Science";
  const moduleTitle = "Introduction to Algorithms";
  const moduleDescription =
    "Learn about fundamental algorithms and their applications";
  const message = "What is the time complexity of quicksort?";

  try {
    // Step 1: Test article generation
    console.log("\n1. Testing article generation...");
    const articleResult = await generateArticle({
      data: {
        subject,
        moduleTitle,
        moduleDescription,
        message,
      },
    });

    console.log(
      `Article generation successful! Content length: ${articleResult.response.length} characters`
    );
    console.log(
      `Article preview: ${articleResult.response.substring(0, 100)}...`
    );

    // Extract bolded terms for tooltip generation
    const boldedTerms = extractBoldedSegments(articleResult.response);
    console.log(
      `Extracted ${boldedTerms.length} bolded terms for tooltip generation`
    );

    // Step 2: Test tooltip generation
    if (boldedTerms.length > 0) {
      console.log("\n2. Testing tooltip generation...");
      const tooltipResult = await generateTooltips({
        data: {
          concepts: boldedTerms,
          subject,
          moduleTitle,
          moduleDescription,
        },
      });

      console.log(
        `Tooltip generation successful! Generated ${Object.keys(tooltipResult.tooltips).length} tooltips`
      );

      // Display a sample tooltip
      const sampleTerm = Object.keys(tooltipResult.tooltips)[0];
      console.log(
        `Sample tooltip for "${sampleTerm}": ${tooltipResult.tooltips[sampleTerm].substring(0, 100)}...`
      );
    } else {
      console.log("\n2. Skipping tooltip generation (no bolded terms found)");
    }

    // Step 3: Test suggested questions generation
    console.log("\n3. Testing suggested questions generation...");
    const questionsResult = await generateSuggestedQuestions({
      data: {
        subject,
        moduleTitle,
        moduleDescription,
        currentMessage: articleResult.response,
      },
    });

    console.log(
      `Question generation successful! Generated ${questionsResult.suggestions.length} questions`
    );

    // Display the suggested questions
    questionsResult.suggestions.forEach((question, index) => {
      console.log(`Question ${index + 1}: ${question}`);
    });

    console.log("\nAll generator integration tests passed successfully!");
  } catch (error) {
    console.error("Error during generator integration verification:", error);
  }
}

// Run the main function
main().catch(console.error);
