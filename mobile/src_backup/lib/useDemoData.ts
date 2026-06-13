// Hook to get translated demo data
import { useLang } from "./i18n";
import { DEMO_JOBS, DEMO_CANDIDATES, CANDIDATE_HEADLINE_KEYS } from "./demoData";

export function useTranslatedDemoJobs() {
  const lang = useLang((s) => s.lang);

  return DEMO_JOBS.map((job) => {
    const j = job as typeof job & { titleFr?: string; titleZh?: string };
    const title =
      lang === "fr" ? (j.titleFr ?? job.title) :
      lang === "zh" ? (j.titleZh ?? job.title) :
      job.title;
    const description =
      lang === "fr" ? (job.descriptionFr ?? job.description) :
      lang === "zh" ? (job.descriptionZh ?? job.description) :
      (job.descriptionEn ?? job.description);
    return { ...job, title, description };
  });
}

export function useTranslatedDemoCandidates() {
  const t = useLang((s) => s.t);

  return DEMO_CANDIDATES.map((candidate) => ({
    ...candidate,
    headline: CANDIDATE_HEADLINE_KEYS[candidate.id]
      ? t(CANDIDATE_HEADLINE_KEYS[candidate.id])
      : candidate.headline,
  }));
}
