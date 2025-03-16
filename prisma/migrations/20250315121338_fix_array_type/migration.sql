/*
  Warnings:

  - The `initiallyFamiliarConcepts` column on the `Subject` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Subject" DROP COLUMN "initiallyFamiliarConcepts",
ADD COLUMN     "initiallyFamiliarConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[];
