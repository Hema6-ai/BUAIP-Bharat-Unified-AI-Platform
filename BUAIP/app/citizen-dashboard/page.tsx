"use client";

import { useState, useEffect } from "react";
import SchemeDetailModal from "@/app/components/SchemeDetailModal";
import { useRegion } from "@/app/lib/regionContext";
import { useLanguage } from "@/app/lib/languageContext";
import { useTranslatedSchemes } from "@/app/lib/useTranslatedScheme";
import { useTranslation } from "@/app/lib/useTranslation";
import type { CategoryConfig } from "@/app/lib/categoryConfig";
import { trackCitizenEvent } from "@/app/lib/citizenTracker";

interface Scheme {
  scheme_name: string;
  domain: string;
  ministry: string;
  description: string;
  target_beneficiaries: string;
  eligibility_criteria: string;
  age_limit: string;
  income_limit: string;
  required_documents: string;
  benefits: string;
  application_mode: string;
  official_apply_link: string;
  state_applicability: string;
  timeline: string;
}

export default function CitizenDashboard() {
  const { region, setRegion } = useRegion();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>(["India"]);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [schemesLoading, setSchemesLoading] = useState(false);

  const handleCategorySelect = (category: CategoryConfig) => {
    setSelectedCategory(category);
    trackCitizenEvent({
      region,
      categorySelected: category.englishName,
      actionType: "browse",
    });
  };

  const handleRegionChange = (nextRegion: string) => {
    setRegion(nextRegion);
    trackCitizenEvent({
      region: nextRegion,
      categorySelected: selectedCategory?.englishName,
      actionType: "browse",
    });
  };

  const handleSchemeOpen = (scheme: Scheme) => {
    setSelectedScheme(scheme);
    trackCitizenEvent({
      region,
      categorySelected: selectedCategory?.englishName,
      schemeShown: scheme.scheme_name,
      actionType: "view",
    });
  };

  const handleApplyClick = (scheme: Scheme) => {
    trackCitizenEvent({
      region,
      categorySelected: selectedCategory?.englishName,
      schemeShown: scheme.scheme_name,
      actionType: "apply",
    });
  };

  // Translate schemes based on selected language
  const { translatedSchemes, isTranslating } = useTranslatedSchemes(schemes, language);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0]);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Load schemes when category changes
  useEffect(() => {
    if (!selectedCategory) return;

    const loadSchemes = async () => {
      setSchemesLoading(true);
      try {
        const response = await fetch(
          `/api/schemes?category=${encodeURIComponent(selectedCategory.englishName)}`
        );
        const data = await response.json();
        setSchemes(data);
        const extractedStates: string[] = Array.from(
          new Set(
            data
              .map((scheme: Scheme) => scheme.state_applicability)
              .filter((state: string) => state && state.trim().length > 0)
          )
        ).sort() as string[];
        setRegionOptions(["India", ...extractedStates]);
      } catch (error) {
        console.error("Failed to load schemes:", error);
        setSchemes([]);
      } finally {
        setSchemesLoading(false);
      }
    };

    loadSchemes();
  }, [selectedCategory]);

  const filteredSchemes = translatedSchemes.filter((scheme) => {
    if (region === "India") return true;

    const stateText = (scheme.state_applicability || "").toLowerCase();
    const selected = region.toLowerCase();
    return (
      stateText.includes("all") ||
      stateText.includes("india") ||
      stateText.includes(selected)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 flex items-center justify-center">
        <div className="text-xl text-indigo-700 font-semibold">
          Loading schemes...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-indigo-100 mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">
            {t("citizen_title")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("citizen_subtitle")}
          </p>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-indigo-100 mb-8">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6">
            {t("citizen_select_category")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => handleCategorySelect(category)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 font-semibold text-left ${
                  selectedCategory?.key === category.key
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {t(`category_${category.key}`)}
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-indigo-100 pt-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-3">
              {t("citizen_select_region")}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {t("citizen_region_description")}
            </p>
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {regionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Schemes Display */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-indigo-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-indigo-900">
              {selectedCategory ? t(`category_${selectedCategory.key}`) : t("citizen_title")}
            </h2>
            <span className="text-sm font-semibold text-gray-500">
              {filteredSchemes.length} scheme{filteredSchemes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {schemesLoading ? (
            <div className="text-center py-12">
              <div className="text-lg text-indigo-700 font-semibold">
                {t("citizen_loading")}
              </div>
            </div>
          ) : isTranslating ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col p-6 rounded-xl border-2 border-gray-200 bg-white animate-pulse"
                >
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
                  <div className="mt-auto pt-4 space-y-2">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-500">
                {t("citizen_no_schemes")} {region}.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchemes.map((scheme) => (
                <div
                  key={scheme.scheme_name}
                  className="flex flex-col p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-indigo-400 hover:shadow-lg transition-all duration-200"
                >
                  <h3 className="text-lg font-bold text-indigo-900 mb-2">
                    {scheme.scheme_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {scheme.description || "Government welfare scheme"}
                  </p>
                  
                  <div className="mt-auto pt-4 space-y-2">
                    <button
                      onClick={() => handleSchemeOpen(scheme)}
                      className="w-full flex items-center justify-center text-indigo-600 font-semibold text-sm border-2 border-indigo-200 rounded-lg py-2 hover:bg-indigo-50 transition-all"
                    >
                    {t("common_view_details")}
                    <span className="ml-2">→</span>
                    </button>
                    
                    {scheme.official_apply_link && (
                      <a
                        href={scheme.official_apply_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyClick(scheme);
                        }}
                        className="w-full flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-lg py-3 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                      >
                        <span className="mr-2">🔗</span>
                        {t("common_apply_now")}
                        <span className="ml-2">↗</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scheme Detail Modal */}
      {selectedScheme && (
        <SchemeDetailModal
          scheme={selectedScheme}
          region={region}
          onClose={() => setSelectedScheme(null)}
        />
      )}
    </div>
  );
}
