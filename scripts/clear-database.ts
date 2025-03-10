import prisma from "../prisma/client.js";

async function clearDatabase() {
  // Delete in order of dependencies (children first, then parents)

  // Delete Layout (depends on PersonalLearningMap)
  await prisma.layout.deleteMany();

  // Delete ContextualTooltip (depends on Article)
  await prisma.contextualTooltip.deleteMany();

  // Delete UserQuestion (depends on Article and PersonalLearningMap)
  await prisma.userQuestion.deleteMany();

  // Delete Article (depends on PersonalLearningMap)
  await prisma.article.deleteMany();

  // Delete MapContext (depends on CurriculumMap, PersonalLearningMap, Subject)
  await prisma.mapContext.deleteMany();

  // Delete PersonalLearningMap
  await prisma.personalLearningMap.deleteMany();

  // Delete CurriculumMap (depends on Subject)
  await prisma.curriculumMap.deleteMany();

  // Delete Subject (no dependencies)
  await prisma.subject.deleteMany();

  console.log("Database cleared: all data removed.");
}

clearDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
