// app/lib/categoryConfig.ts
export interface CategoryConfig {
  key: string;
  englishName: string;
}

export const categoryConfigs: CategoryConfig[] = [
  {
    key: "agriculture",
    englishName: "Agriculture & Allied Activities",
  },
  {
    key: "disability",
    englishName: "Disability Support (Divyang Schemes)",
  },
  {
    key: "education",
    englishName: "Education & Scholarships",
  },
  {
    key: "health",
    englishName: "Health & Public Health",
  },
  {
    key: "sc_st_obc",
    englishName: "SC/ST/OBC Welfare",
  },
  {
    key: "senior",
    englishName: "Senior Citizen Welfare",
  },
  {
    key: "women_child",
    englishName: "Women Empowerment & Child Welfare",
  },
];

// Map English names to keys for backward compatibility
export function getCategoryKey(englishName: string): string {
  const config = categoryConfigs.find(
    (c) => c.englishName === englishName
  );
  return config?.key || englishName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

// Get English name from key
export function getCategoryEnglishName(key: string): string {
  const config = categoryConfigs.find((c) => c.key === key);
  return config?.englishName || key;
}
