// app/components/AIConfidenceScore.tsx
"use client";

interface AIConfidenceScoreProps {
  confidence: number;
  className?: string;
}

export function AIConfidenceScore({ confidence, className = "" }: AIConfidenceScoreProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-orange-600 bg-orange-50 border-orange-200";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return "High Confidence";
    if (score >= 60) return "Medium Confidence";
    return "Moderate Confidence";
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">
            AI Confidence
          </span>
          <span className={`text-xs font-semibold ${getConfidenceColor(confidence).split(' ')[0]}`}>
            {confidence}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getBarColor(confidence)}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
      <div
        className={`px-3 py-1 rounded-full border text-xs font-medium ${getConfidenceColor(confidence)}`}
      >
        {getConfidenceLabel(confidence)}
      </div>
    </div>
  );
}
