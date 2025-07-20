/*
  Warnings:

  - You are about to drop the column `authorId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Thread` table. All the data in the column will be lost.
  - Added the required column `authorEmail` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorEmail` to the `Thread` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_authorId_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "authorId",
ADD COLUMN     "authorEmail" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "authorId",
ADD COLUMN     "authorEmail" TEXT NOT NULL;
