/**
 * GitLab Configuration Module
 *
 * Manages GitLab API proxy configuration including base URL, authentication token, and timeout settings.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface GitLabConfig {
  baseUrl: string;
  privateToken: string;
  timeout: number;
}

let cachedConfig: GitLabConfig | null = null;

/**
 * Get GitLab configuration from gitlab-config.json
 * Caches the config after first read for performance
 */
export function getGitLabConfig(): GitLabConfig | null {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Try multiple possible config file locations
  const possiblePaths = [
    path.join(process.cwd(), 'gitlab-config.json'),
    path.join(__dirname, '../../gitlab-config.json'),
    path.join(__dirname, '../../../gitlab-config.json'),
  ];

  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent) as GitLabConfig;

        // Validate required fields
        if (!config.baseUrl || !config.privateToken) {
          console.error(`Invalid GitLab config at ${configPath}: missing baseUrl or privateToken`);
          continue;
        }

        // Remove trailing slash from baseUrl
        config.baseUrl = config.baseUrl.replace(/\/$/, '');

        // Set default timeout if not provided
        if (!config.timeout) {
          config.timeout = 30000;
        }

        cachedConfig = config;
        console.log(`GitLab config loaded from: ${configPath}`);
        return config;
      } catch (error) {
        console.error(`Error reading GitLab config from ${configPath}:`, error);
      }
    }
  }

  console.warn('GitLab config not found. Create gitlab-config.json with baseUrl and privateToken.');
  return null;
}

/**
 * Check if GitLab is configured
 */
export function isGitLabConfigured(): boolean {
  return getGitLabConfig() !== null;
}

/**
 * Clear cached config (useful for testing or config reload)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
