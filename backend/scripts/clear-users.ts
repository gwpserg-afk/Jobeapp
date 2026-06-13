import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const userCount = await p.user.count();
  console.log("Users before deletion:", userCount);

  // Delete verification and OTP records (no user FK cascade)
  await p.verification.deleteMany();
  await p.phoneOtp.deleteMany();

  // Delete auth-related records that cascade from User but delete explicitly
  await p.session.deleteMany();
  await p.account.deleteMany();
  await p.phoneNumber.deleteMany();

  // Delete user activity records
  await p.report.deleteMany();
  await p.profileView.deleteMany();
  await p.postLike.deleteMany();
  await p.postComment.deleteMany();
  await p.postRepost.deleteMany();
  await p.post.deleteMany();
  await p.notification.deleteMany();
  await p.message.deleteMany();
  await p.creditTransaction.deleteMany();
  await p.promotion.deleteMany();
  await p.identityVerification.deleteMany();

  // Delete candidate profile sub-tables
  await p.application.deleteMany();
  await p.savedCandidate.deleteMany();
  await p.recommendation.deleteMany();
  await p.portfolioItem.deleteMany();
  await p.candidateLanguage.deleteMany();
  await p.candidateSkill.deleteMany();
  await p.candidateExperience.deleteMany();
  await p.candidateEducation.deleteMany();
  await p.savedJob.deleteMany();
  await p.candidateProfile.deleteMany();

  // Delete company sub-tables
  await p.jobRequiredSkill.deleteMany();
  await p.companyTeamMember.deleteMany();
  await p.jobListing.deleteMany();
  await p.company.deleteMany();

  // Finally delete all users
  const result = await p.user.deleteMany();
  console.log("Users deleted:", result.count);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
