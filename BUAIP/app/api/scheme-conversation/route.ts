/**
 * BUAIP Scheme Eligibility Engine - AWS Bedrock + Kendra RAG + Web Fetching
 * 
 * Real AI System Using:
 * - AWS Bedrock Claude for LLM (detailed, conversational responses)
 * - Amazon Kendra for RAG (Retrieval Augmented Generation)
 * - Web Fetcher with Real Government Scheme Data (fallback)
 * - DynamoDB for conversation state
 * 
 * No mocks. No static responses. Pure AI with real government data.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateConversationResponse } from "@/app/lib/aws/bedrock";
import { retrieveSchemes, buildKendraQuery } from "@/app/lib/aws/kendra";
import {
  getSession,
  createSession,
  updateSession,
  addMessage,
  UserProfile,
  ConversationMessage,
} from "@/app/lib/aws/dynamodb";
import {
  buildProfileCollectionPrompt,
  buildSchemeRecommendationPrompt,
} from "@/app/lib/aws/systemPrompts";
import { fetchSchemeData } from "@/app/lib/aws/schemeDataFetcher";

// ═══════════════════════════════════════════════════════════════
// PROFILE EXTRACTION FROM USER MESSAGE
// ═══════════════════════════════════════════════════════════════

function extractProfileFromMessage(
  userMessage: string,
  currentProfile: UserProfile
): Partial<UserProfile> {
  const updates: Partial<UserProfile> = {};
  const text = userMessage.toLowerCase();

  // Gender extraction
  if (text.includes("female") || text.includes("woman") || text.includes("girl")) {
    updates.gender = "female";
  } else if (text.includes("male") || text.includes("man") || text.includes("boy")) {
    updates.gender = "male";
  } else if (text.includes("other")) {
    updates.gender = "other";
  }

  // Age extraction
  const ageMatch = text.match(/\b(\d{2})\b/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 18 && age <= 25) updates.age_group = "18-25";
    else if (age >= 26 && age <= 40) updates.age_group = "26-40";
    else if (age >= 41 && age <= 60) updates.age_group = "41-60";
    else if (age > 60) updates.age_group = "60+";
  } else if (text.includes("18-25")) updates.age_group = "18-25";
  else if (text.includes("26-40")) updates.age_group = "26-40";
  else if (text.includes("41-60")) updates.age_group = "41-60";
  else if (text.includes("60+")) updates.age_group = "60+";

  // State extraction
  const states = [
    "andhra pradesh",
    "arunachal pradesh",
    "assam",
    "bihar",
    "chhattisgarh",
    "goa",
    "gujarat",
    "haryana",
    "himachal pradesh",
    "jharkhand",
    "karnataka",
    "kerala",
    "madhya pradesh",
    "maharashtra",
    "manipur",
    "meghalaya",
    "mizoram",
    "nagaland",
    "odisha",
    "punjab",
    "rajasthan",
    "sikkim",
    "tamil nadu",
    "telangana",
    "tripura",
    "uttar pradesh",
    "uttarakhand",
    "west bengal",
    "delhi",
    "puducherry",
    "ladakh",
    "chandigarh",
  ];

  for (const state of states) {
    if (text.includes(state)) {
      updates.state = state
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  // Income extraction (requires income keywords)
  const incomeMatch = text.match(/(\d+(?:,\d{3})*)\s*(?:lakh|lakhs|lacs|crore|crores|thousand|rupee|rs|per year|annually|per annum|pa)\b/i);
  if (incomeMatch) {
    let income = parseInt(incomeMatch[1].replace(/,/g, ""));
    if (/lakh|lac/i.test(text)) income = income * 100000;
    else if (/crore/i.test(text)) income = income * 10000000;
    else if (/thousand/i.test(text)) income = income * 1000;
    if (income > 0) updates.annual_income = income;
  }

  // Social category extraction
  if (/\bgeneral\b/i.test(text)) updates.social_category = "general";
  else if (/\bobc\b|other.*backward/i.test(text)) updates.social_category = "obc";
  else if (/\bsc\b|scheduled.*caste/i.test(text)) updates.social_category = "sc";
  else if (/\bst\b|scheduled.*tribe/i.test(text)) updates.social_category = "st";
  else if (/\bews\b|economically.*weak/i.test(text)) updates.social_category = "ews";

  // Disability extraction
  const hasYes = /\byes\b|have \w+ disability|disabled/i.test(text);
  const hasNo = /\bno\b|don't|dont|no\s+disability|not disabled/i.test(text);
  if (hasYes && !hasNo) updates.disability = true;
  if (hasNo && !hasYes) updates.disability = false;

  // Marital status extraction
  if (/\bsingle\b/i.test(text)) updates.marital_status = "single";
  else if (/\bmarried\b/i.test(text)) updates.marital_status = "married";
  else if (/\bwidow|widowed/i.test(text)) updates.marital_status = "widowed";
  else if (/\bdivorc/i.test(text)) updates.marital_status = "divorced";

  // Land/property extraction
  if (/own.*land|agricultural.*land|farm.*land/i.test(text)) updates.land_ownership = "owns_land";
  else if (/own.*house|own.*home|apartment|flat/i.test(text)) updates.land_ownership = "owns_house";
  else if (/\bboth\b/i.test(text)) updates.land_ownership = "owns_both";
  else if (/neither|no.*property|landless/i.test(text)) updates.land_ownership = "owns_neither";
  else if (/tenant.*farmer/i.test(text)) updates.land_ownership = "tenant_farmer";

  return updates;
}

// ═══════════════════════════════════════════════════════════════
// MAIN API HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message: userMessage, sessionId: providedSessionId } = body;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'message' field" },
        { status: 400 }
      );
    }

    // ═════════════════════════════════════════════════════════════
    // SESSION MANAGEMENT
    // ═════════════════════════════════════════════════════════════

    const sessionId = providedSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get or create session
    let session = await getSession(sessionId);
    if (!session) {
      session = await createSession(sessionId);
    }

    // ═════════════════════════════════════════════════════════════
    // PROFILE EXTRACTION
    // ═════════════════════════════════════════════════════════════

    const profileUpdates = extractProfileFromMessage(userMessage, session.profile);
    const updatedProfile = { ...session.profile, ...profileUpdates };

    // Track completed fields
    const REQUIRED_FIELDS = [
      "gender",
      "age_group",
      "state",
      "annual_income",
      "social_category",
      "disability",
      "marital_status",
      "land_ownership",
    ];

    const completedFields = REQUIRED_FIELDS.filter((f) => updatedProfile[f as keyof UserProfile] !== undefined);
    const isProfileComplete = completedFields.length === REQUIRED_FIELDS.length;

    // ═════════════════════════════════════════════════════════════
    // CALL CLAUDE VIA BEDROCK (PROFILE COLLECTION PHASE)
    // ═════════════════════════════════════════════════════════════

    // Use profile collection prompt during data gathering
    const systemPrompt = buildProfileCollectionPrompt(updatedProfile, completedFields);

    const conversationContext = session.messages
      .slice(-6)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const claudeResponse = await generateConversationResponse(
      systemPrompt,
      userMessage,
      conversationContext
    );

    // ═════════════════════════════════════════════════════════════
    // SCHEME RETRIEVAL & DETAILED RECOMMENDATIONS
    // ═════════════════════════════════════════════════════════════

    let schemes: any[] = [];
    let responseToUser = claudeResponse;
    let detailedRecommendationResponse = "";

    if (isProfileComplete || claudeResponse.includes("[PROFILE_COMPLETE]")) {
      console.log(
        "[Engine] Profile complete. Retrieving schemes for recommendation..."
      );

      // Build Kendra query from profile
      const kendraQuery = buildKendraQuery(updatedProfile);
      console.log(`[RAG] Searching for schemes with query: ${kendraQuery}`);

      // Try Kendra first
      let rawSchemes = await retrieveSchemes(kendraQuery, sessionId);

      // Fallback to web fetcher if Kendra returns no results
      if (rawSchemes.length === 0) {
        console.log(
          "[Engine] Kendra returned 0 results. Falling back to web fetcher..."
        );
        try {
          const webSchemes = await fetchSchemeData({
            state: updatedProfile.state,
            category: updatedProfile.social_category,
            income: updatedProfile.annual_income,
          });
          rawSchemes = webSchemes.map((scheme) => ({
            title: scheme.scheme_name,
            content: scheme.description || scheme.benefit || "",
            metadata: {
              ministry: scheme.ministry,
              state: scheme.state || "All India",
              eligibility: scheme.eligibility,
              apply_link: scheme.apply_link,
              helpline: scheme.helpline,
              documents: scheme.documents,
              benefit: scheme.benefit,
            },
            relevanceScore: 0.8, // Default score for web-fetched schemes
          }));
          console.log(
            `[Engine] Web fetcher returned ${rawSchemes.length} schemes`
          );
        } catch (error) {
          console.error("[Engine] Web fetcher error:", error);
        }
      }

      // Format schemes for display
      schemes = rawSchemes.slice(0, 10).map((scheme: any) => {
        const schemeData = scheme as any;
        return {
          name: schemeData.title || schemeData.scheme_name || "Unknown Scheme",
          ministry: schemeData.metadata?.ministry || schemeData.ministry || "Government of India",
          eligibility: schemeData.metadata?.eligibility || schemeData.eligibility || "See official portal",
          benefits: schemeData.content || schemeData.metadata?.benefit || schemeData.benefit || "Check scheme details",
          apply_link: schemeData.metadata?.apply_link || schemeData.apply_link || "#",
          helpline: schemeData.metadata?.helpline || schemeData.helpline || "See portal",
          documents: schemeData.metadata?.documents || schemeData.documents || [],
          relevance: schemeData.relevanceScore || 0.8,
        };
      });

      // Now call Claude AGAIN with detailed recommendation prompt
      // This tells Claude to provide DETAILED explanations like ChatGPT
      if (schemes.length > 0) {
        console.log(
          `[Engine] Found ${schemes.length} schemes. Calling Claude for detailed recommendations...`
        );

        const detailedPrompt = buildSchemeRecommendationPrompt(
          updatedProfile,
          rawSchemes
        );

        // Ask Claude to analyze and recommend schemes in detail
        const recommendationUserMessage =
          "Based on your profile and the available schemes, please provide detailed recommendations on which government schemes you are eligible for. Explain each scheme thoroughly.";

        detailedRecommendationResponse = await generateConversationResponse(
          detailedPrompt,
          recommendationUserMessage,
          [] // Fresh context for recommendations
        );

        // Use Claude's detailed response
        responseToUser = detailedRecommendationResponse;
      } else {
        responseToUser =
          "I searched for schemes matching your profile, but could not find any results at this time. Please try again later or visit the official schemes portal at https://www.myscheme.gov.in";
      }

      // Clear the [PROFILE_COMPLETE] marker if present
      responseToUser = responseToUser.replace("[PROFILE_COMPLETE]", "").trim();
    }

    // ═════════════════════════════════════════════════════════════
    // UPDATE SESSION IN DYNAMODB
    // ═════════════════════════════════════════════════════════════

    // Add user message
    await addMessage(sessionId, "user", userMessage);

    // Add Claude response
    await addMessage(sessionId, "assistant", responseToUser);

    // Update profile and completed fields
    await updateSession(sessionId, {
      profile: updatedProfile,
      completedFields,
    });

    // ═════════════════════════════════════════════════════════════
    // BUILD RESPONSE
    // ═════════════════════════════════════════════════════════════

    if (schemes.length > 0) {
      return NextResponse.json({
        type: "schemes",
        message: responseToUser,
        schemes: schemes,
        profile: updatedProfile,
        profileProgress: {
          completed: completedFields.length,
          total: REQUIRED_FIELDS.length,
        },
        sessionId,
      });
    }

    return NextResponse.json({
      type: "message",
      text: responseToUser,
      profile: updatedProfile,
      profileProgress: {
        completed: completedFields.length,
        total: REQUIRED_FIELDS.length,
      },
      sessionId,
    });
  } catch (error) {
    console.error("[Scheme Conversation] Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}