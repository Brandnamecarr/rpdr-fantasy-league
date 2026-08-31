// Doc: S3 utility for reading and writing files in the rpdr-fantasy-league bucket.
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import logger from '../logger/LoggerImpl';
import { S3FileInput } from '../../types/Interfaces';

const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? 'rpdr-fantasy-league';
const REGION = process.env.AWS_REGION ?? 'us-west-2';

const s3Client = new S3Client({ region: REGION });

// Doc: Uploads a file to the rpdr-fantasy-league bucket.
// Doc: Args: key (string) - Object key/path within the bucket, body (Buffer | Uint8Array | string) - File contents, contentType (string?) - Optional MIME type
export async function putFile(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType,
        }));
        logger.debug('S3Manager.putFile() -> uploaded object', { key });
    } catch (error) {
        logger.error('S3Manager.putFile() -> failed to upload object', { key, error });
        throw new Error(`Failed to upload file to S3: ${key}`);
    }
}

// Doc: Uploads multiple files to the rpdr-fantasy-league bucket in parallel.
// Doc: Args: files (S3FileInput[]) - Files to upload, each with a key, body, and optional contentType
export async function putFiles(files: S3FileInput[]): Promise<void> {
    await Promise.all(files.map(file => putFile(file.key, file.body, file.contentType)));
}

// Doc: Downloads a file from the rpdr-fantasy-league bucket.
// Doc: Args: key (string) - Object key/path within the bucket
// Doc: Returns: Promise<Buffer> - The file contents
export async function getFile(key: string): Promise<Buffer> {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        }));
        const bytes = await response.Body?.transformToByteArray();
        if (!bytes) {
            throw new Error('Empty response body');
        }
        logger.debug('S3Manager.getFile() -> downloaded object', { key });
        return Buffer.from(bytes);
    } catch (error) {
        logger.error('S3Manager.getFile() -> failed to download object', { key, error });
        throw new Error(`Failed to download file from S3: ${key}`);
    }
}

// Doc: Downloads multiple files from the rpdr-fantasy-league bucket in parallel.
// Doc: Args: keys (string[]) - Object keys/paths within the bucket
// Doc: Returns: Promise<Map<string, Buffer>> - File contents keyed by object key
export async function getFiles(keys: string[]): Promise<Map<string, Buffer>> {
    const entries = await Promise.all(keys.map(async key => [key, await getFile(key)] as const));
    return new Map(entries);
}

// Doc: Lists object keys in the rpdr-fantasy-league bucket, optionally filtered by prefix. Paginates internally.
// Doc: Args: prefix (string?) - Only list keys starting with this prefix
// Doc: Returns: Promise<string[]> - Matching object keys
export async function listKeys(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    try {
        do {
            const response = await s3Client.send(new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            }));
            for (const object of response.Contents ?? []) {
                if (object.Key) keys.push(object.Key);
            }
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);

        logger.debug('S3Manager.listKeys() -> listed objects', { prefix, count: keys.length });
        return keys;
    } catch (error) {
        logger.error('S3Manager.listKeys() -> failed to list objects', { prefix, error });
        throw new Error('Failed to list files in S3');
    }
}
