import { CitizenProfile, Scheme, EligibilityResult, EligibilityAnalysis } from './schemeEligibilityTypes';
import { SchemeDatabase } from './schemeDatabase';

export class EligibilityEngine {
  /**
   * Check if a citizen is eligible for a specific scheme
   * Returns eligibility status and matching criteria
   */
  static checkEligibility(profile: CitizenProfile, scheme: Scheme): EligibilityResult {
    const matchedCriteria: string[] = [];
    const unmatchedCriteria: string[] = [];
    let score = 0;
    const totalCriteria = 7; // Total number of criteria we check

    // Helper function to convert age group string to numeric value
    const getNumericAge = (age: number | string | undefined): number | undefined => {
      if (age === undefined) return undefined;
      if (typeof age === 'number') return age;
      if (typeof age === 'string') {
        // Extract first number from age group like "26-40"
        const match = age.match(/\d+/);
        return match ? parseInt(match[0]) : undefined;
      }
      return undefined;
    };

    const numericAge = getNumericAge(profile.age);

    // 1. Age Check
    if (numericAge !== undefined) {
      if (scheme.minAge === undefined || numericAge >= scheme.minAge) {
        if (scheme.maxAge === undefined || numericAge <= scheme.maxAge) {
          matchedCriteria.push(`Age ${profile.age} is within eligibility range`);
          score += 1;
        } else {
          unmatchedCriteria.push(`Age ${profile.age} exceeds maximum age (${scheme.maxAge})`);
        }
      } else {
        unmatchedCriteria.push(`Age ${profile.age} is below minimum age (${scheme.minAge})`);
      }
    } else {
      unmatchedCriteria.push('Age information not provided');
    }

    // 2. Category Check
    if (profile.socialCategory && scheme.eligibleCategories.includes(profile.socialCategory)) {
      matchedCriteria.push(`Social category "${profile.socialCategory}" is eligible`);
      score += 1;
    } else if (profile.socialCategory && profile.socialCategory !== 'prefer_not_to_say') {
      unmatchedCriteria.push(`Social category "${profile.socialCategory}" not eligible for this scheme`);
    }

    // 3. Occupation Check
    if (profile.occupation && scheme.eligibleOccupations.includes(profile.occupation)) {
      matchedCriteria.push(`Occupation "${profile.occupation}" is eligible`);
      score += 1;
    } else if (profile.occupation) {
      unmatchedCriteria.push(`Occupation "${profile.occupation}" not eligible for this scheme`);
    }

    // 4. Income Check
    if (profile.annualHouseholdIncome !== undefined) {
      if (scheme.incomeLimit === undefined || profile.annualHouseholdIncome <= scheme.incomeLimit) {
        matchedCriteria.push(`Income ₹${profile.annualHouseholdIncome.toLocaleString('en-IN')} is within limit`);
        score += 1;
      } else if (scheme.incomeLimit !== undefined) {
        unmatchedCriteria.push(
          `Income ₹${profile.annualHouseholdIncome.toLocaleString('en-IN')} exceeds limit (₹${scheme.incomeLimit.toLocaleString('en-IN')})`
        );
      }
    }

    // 5. State Check (simplified - in production connect to actual state-wise schemes)
    // For now, all-india schemes are always available
    if (profile.state) {
      if (scheme.state === 'all_india') {
        matchedCriteria.push(`Available in your state (${profile.state})`);
        score += 1;
      } else if (scheme.state === profile.state) {
        matchedCriteria.push(`Available in your state (${profile.state})`);
        score += 1;
      } else {
        unmatchedCriteria.push(`Only available in ${scheme.state}, not in ${profile.state}`);
      }
    }

    // 6. Special Conditions Bonus (if scheme mentions special conditions)
    const hasSpecialConditions = profile.specialConditions && Object.values(profile.specialConditions).some((v) => v === true);
    if (
      hasSpecialConditions &&
      (scheme.targetGroup.some((group) =>
        ['Widow', 'Disability', 'Senior citizen', 'Vulnerable'].includes(group)
      ) ||
        scheme.schemeName.toLowerCase().includes('widow') ||
        scheme.schemeName.toLowerCase().includes('disability') ||
        scheme.schemeName.toLowerCase().includes('senior'))
    ) {
      matchedCriteria.push(`Special conditions you qualify for are supported`);
      score += 1;
    }

    // 7. Land Ownership for Farmer Schemes
    if (profile.occupation === 'farmer' && scheme.targetGroup.includes('Landowners')) {
      if (profile.landOwnership === 'owns_land') {
        matchedCriteria.push('Land ownership verified for farmer schemes');
        score += 1;
      } else if (profile.landOwnership === 'tenant_farmer') {
        matchedCriteria.push('Tenant farmers may be eligible (check specific scheme)');
        score += 0.5;
      }
    } else if (profile.occupation !== 'farmer') {
      // Non-farmer schemes
      score += 1; // Don't penalize non-farmers
    }

    // Calculate eligibility score as percentage
    const eligibilityScore = Math.round((score / totalCriteria) * 100);
    const isEligible = eligibilityScore >= 80; // 80% match = eligible

    // Generate AI explanation
    const explanation = this.generateExplanation(profile, scheme, matchedCriteria, unmatchedCriteria, isEligible);

    return {
      schemeId: scheme.schemeId,
      schemeName: scheme.schemeName,
      isEligible,
      eligibilityScore,
      matchedCriteria,
      unmatchedCriteria,
      benefits: scheme.benefits,
      filesRequired: scheme.filesRequired,
      applicationLink: scheme.applicationLink,
      applicationMode: scheme.applicationMode,
      explanation,
    };
  }

  /**
   * Analyze entire citizen profile against all schemes
   */
  static async analyzeProfile(profile: CitizenProfile): Promise<EligibilityAnalysis> {
    // Get all schemes available in the state
    const allSchemes = await SchemeDatabase.getSchemes({
      state: profile.state,
      occupation: profile.occupation,
      category: profile.socialCategory,
    });

    const results: EligibilityResult[] = [];

    // Check eligibility for each scheme
    for (const scheme of allSchemes) {
      const result = this.checkEligibility(profile, scheme);
      results.push(result);
    }

    // Separate eligible and partially eligible
    const eligibleSchemes = results.filter((r) => r.isEligible && r.eligibilityScore >= 80);
    const partiallyEligibleSchemes = results.filter(
      (r) => !r.isEligible && r.eligibilityScore >= 50 && r.eligibilityScore < 80
    );

    // Sort by eligibility score
    eligibleSchemes.sort((a, b) => b.eligibilityScore - a.eligibilityScore);
    partiallyEligibleSchemes.sort((a, b) => b.eligibilityScore - a.eligibilityScore);

    // Generate next steps
    const nextSteps = this.generateNextSteps(profile, eligibleSchemes, partiallyEligibleSchemes);

    // Priority ranking (which schemes to apply first)
    const applicationPriority = this.rankSchemesForApplication(eligibleSchemes, profile);

    return {
      userId: `user_${Date.now()}`, // In production, use actual user ID
      profileSummary: {
        state: profile.state,
        occupation: profile.occupation,
        age: profile.age,
        annualHouseholdIncome: profile.annualHouseholdIncome,
        socialCategory: profile.socialCategory,
      },
      totalSchemesAnalyzed: allSchemes.length,
      eligibleSchemes,
      partiallyEligibleSchemes,
      nextSteps,
      applicationPriority,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate AI-friendly explanation for each scheme
   */
  private static generateExplanation(
    profile: CitizenProfile,
    scheme: Scheme,
    matched: string[],
    unmatched: string[],
    isEligible: boolean
  ): string {
    if (isEligible) {
      return `You are eligible for ${scheme.schemeName}. ${matched.join('. ')}. The scheme provides ${scheme.benefits[0]?.toLowerCase() || 'various benefits'}. You will need ${scheme.filesRequired.slice(0, 2).join(', ')} to apply.`;
    } else {
      if (unmatched.length > 0) {
        return `You may not be fully eligible for ${scheme.schemeName} because: ${unmatched.join('. ')}. However, it's worth checking the detailed eligibility on the official website.`;
      }
      return `Based on your profile, you may not be eligible for ${scheme.schemeName}. Check the scheme details for exceptions.`;
    }
  }

  /**
   * Generate actionable next steps based on analysis
   */
  private static generateNextSteps(
    profile: CitizenProfile,
    eligible: EligibilityResult[],
    partial: EligibilityResult[]
  ): string[] {
    const steps: string[] = [];

    if (eligible.length === 0 && partial.length === 0) {
      steps.push('No schemes found matching your profile. Consider updating your profile information.');
      return steps;
    }

    if (eligible.length > 0) {
      steps.push(`✓ You are eligible for ${eligible.length} scheme(s). Start by documenting the required files.`);
      steps.push(`✓ Highest match: ${eligible[0].schemeName} (${eligible[0].eligibilityScore}% match)`);
      steps.push(`→ Apply for ${eligible[0].schemeName} first at ${eligible[0].applicationLink}`);
    }

    if (partial.length > 0) {
      steps.push(
        `✓ You have ${partial.length} partially matching scheme(s). Verify detailed eligibility on official websites.`
      );
    }

    if (profile.occupation === 'farmer') {
      if (profile.landOwnership === 'landless') {
        steps.push('→ Since you are landless, focus on landless farmer schemes or wage support programs.');
      } else if (profile.landOwnership === 'tenant_farmer') {
        steps.push('→ As a tenant farmer, verify whether schemes accept tenant farmers before applying.');
      }
    }

    if (profile.annualHouseholdIncome !== undefined && profile.annualHouseholdIncome < 300000) {
      steps.push('→ You may be eligible for additional welfare programs. Check BPL-specific schemes.');
    }

    steps.push('→ Keep documents ready: Aadhaar, Bank account, Proof of residence');

    return steps;
  }

  /**
   * Rank schemes by priority for application
   * Consider: benefit amount, effort required, processing time
   */
  private static rankSchemesForApplication(
    schemes: EligibilityResult[],
    profile: CitizenProfile
  ): EligibilityResult[] {
    // Simple ranking: by eligibility score first, then bonus for high-benefit schemes
    const ratedSchemes = schemes.map((scheme) => {
      let priority = scheme.eligibilityScore;

      // Bonus points for high-impact schemes
      if (scheme.benefits.some((b) => b.includes('₹') && b.includes('lakh'))) {
        priority += 10; // High-value benefit
      }
      if (scheme.applicationMode === 'online') {
        priority += 5; // Easier to apply
      }
      if (scheme.filesRequired.length <= 4) {
        priority += 5; // Fewer documents needed
      }

      return { ...scheme, priority };
    });

    return ratedSchemes
      .sort((a, b) => b.priority - a.priority)
      .map(({ priority, ...rest }) => rest);
  }

  /**
   * Get recommendations based on special circumstances
   */
  static getSpecialRecommendations(profile: CitizenProfile): string[] {
    const recommendations: string[] = [];

    if (profile.specialConditions?.disability) {
      recommendations.push('→ Check disability-specific government schemes and exemptions');
      recommendations.push('→ You may be eligible for 3% job reservation and financial assistance');
    }

    if (profile.specialConditions?.widow) {
      recommendations.push('→ Widow-specific schemes: Widow Pension, IGNWPS available');
      recommendations.push('→ Children scholarships and educational support available');
    }

    if (profile.specialConditions?.singleParent) {
      recommendations.push('→ Single parent schemes provide child care and education support');
      recommendations.push('→ Check Integrated Child Protection Scheme');
    }

    if (profile.specialConditions?.veteran) {
      recommendations.push('→ Department of Pensioners scheme and medical benefits');
      recommendations.push('→ Job preference for family members');
    }

    if (profile.occupation === 'student' && profile.annualHouseholdIncome !== undefined && profile.annualHouseholdIncome < 600000) {
      recommendations.push('→ You may qualify for merit and means scholarships');
      recommendations.push('→ Central Sector Scheme of Scholarship available for eligible students');
    }

    return recommendations;
  }
}
