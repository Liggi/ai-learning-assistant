import prisma from "../prisma/client.ts";

async function clearDatabase() {
  // Delete in order of dependencies (children first, then parents)

  await prisma.learningMap.deleteMany();

  // Delete Article (depends on PersonalLearningMap)
  await prisma.article.deleteMany();

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
