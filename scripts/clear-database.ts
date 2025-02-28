import prisma from "../prisma/client.js";

async function clearDatabase() {
  await prisma.roadmap.deleteMany();
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
