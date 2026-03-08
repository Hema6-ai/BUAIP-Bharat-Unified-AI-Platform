import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { streamToString } from './streamHelper';

// ============================================================================
// TYPES
// ============================================================================

export interface DatasetLoaderOptions {
  bucket?: string;
  region?: string;
}

// ============================================================================
// S3 CLIENT
// ============================================================================

let s3Client: S3Client | null = null;

function getS3Client(region: string): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

// ============================================================================
// CSV PARSER
// ============================================================================

/**
 * Simple CSV parser that converts CSV string to JSON array
 */
function parseCSV(csvContent: string): Record<string, unknown>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 1) {
    return [];
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim());

  // Parse data rows
  const data: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, unknown> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value: unknown = values[j];

      // Try to parse as number
      if (value && !isNaN(Number(value))) {
        value = Number(value);
      }

      row[header] = value;
    }

    data.push(row);
  }

  return data;
}

// ============================================================================
// DATASET LOADER
// ============================================================================

/**
 * Load a CSV dataset from S3 and parse it to JSON
 * @param fileName Name of the CSV file in S3
 * @param options S3 configuration options
 * @returns Parsed dataset as JSON array
 */
export async function loadDataset(
  fileName: string,
  options: DatasetLoaderOptions = {}
): Promise<Record<string, unknown>[]> {
  try {
    const bucket = options.bucket || process.env.AWS_DATASETS_BUCKET || 'buaip-datasets';
    const region = options.region || process.env.AWS_REGION || 'ap-south-1';

    console.log(`[S3] Loading dataset: s3://${bucket}/${fileName}`);

    const s3 = getS3Client(region);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error('No data received from S3');
    }

    // Convert stream to string
    const csvContent = await streamToString(response.Body);

    // Parse CSV to JSON
    const dataset = parseCSV(csvContent);

    console.log(`[S3] Dataset loaded successfully: ${dataset.length} rows`);

    return dataset;
  } catch (error) {
    console.error('[S3] Error loading dataset:', error);
    throw new Error(
      `Failed to load dataset: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Load and cache datasets (useful for datasets that don't change frequently)
 */
const datasetCache = new Map<string, Record<string, unknown>[]>();

export async function loadDatasetCached(
  fileName: string,
  options: DatasetLoaderOptions = {},
  cacheDurationMs: number = 3600000 // 1 hour default
): Promise<Record<string, unknown>[]> {
  const cacheKey = `${options.bucket || 'default'}:${fileName}`;

  // Check cache
  if (datasetCache.has(cacheKey)) {
    console.log(`[S3] Dataset served from cache: ${cacheKey}`);
    return datasetCache.get(cacheKey) || [];
  }

  // Load from S3
  const dataset = await loadDataset(fileName, options);

  // Store in cache
  datasetCache.set(cacheKey, dataset);

  // Clear cache after duration
  setTimeout(() => {
    datasetCache.delete(cacheKey);
    console.log(`[S3] Cache cleared: ${cacheKey}`);
  }, cacheDurationMs);

  return dataset;
}

/**
 * Get dataset with filtering
 */
export async function loadDatasetWithFilter(
  fileName: string,
  filterFn: (row: Record<string, unknown>) => boolean,
  options: DatasetLoaderOptions = {}
): Promise<Record<string, unknown>[]> {
  const dataset = await loadDataset(fileName, options);
  return dataset.filter(filterFn);
}

/**
 * Preload multiple datasets
 */
export async function preloadDatasets(
  fileNames: string[],
  options: DatasetLoaderOptions = {}
): Promise<Map<string, Record<string, unknown>[]>> {
  const results = new Map<string, Record<string, unknown>[]>();

  for (const fileName of fileNames) {
    try {
      const dataset = await loadDataset(fileName, options);
      results.set(fileName, dataset);
    } catch (error) {
      console.error(`Failed to preload ${fileName}:`, error);
    }
  }

  return results;
}
