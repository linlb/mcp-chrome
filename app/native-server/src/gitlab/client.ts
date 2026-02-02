/**
 * GitLab API Client
 *
 * Generic HTTP proxy for GitLab API requests.
 * Handles authentication, request forwarding, and response parsing.
 */
import fetch, { Response } from 'node-fetch';
import { getGitLabConfig } from './config';

export interface GitLabRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

export interface GitLabResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
}

/**
 * Make a request to GitLab API
 */
export async function gitlabRequest(options: GitLabRequestOptions): Promise<GitLabResponse> {
  const config = getGitLabConfig();

  if (!config) {
    throw new Error(
      'GitLab is not configured. Please create gitlab-config.json with baseUrl and privateToken.',
    );
  }

  // Ensure path starts with /
  let apiPath = options.path;
  if (!apiPath.startsWith('/')) {
    apiPath = '/' + apiPath;
  }

  // Build URL with query parameters
  const url = new URL(config.baseUrl + apiPath);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  // Build headers
  const headers: Record<string, string> = {
    'PRIVATE-TOKEN': config.privateToken,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Build request options
  const fetchOptions: any = {
    method: options.method,
    headers,
    timeout: config.timeout,
  };

  // Add body for non-GET requests
  if (options.method !== 'GET' && options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // Make request
  let response: Response;
  try {
    response = await fetch(url.toString(), fetchOptions);
  } catch (error: any) {
    throw new Error(`GitLab request failed: ${error.message}`);
  }

  // Parse response
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let data: any;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (error) {
      data = await response.text();
    }
  } else {
    data = await response.text();
  }

  // Return response
  return {
    status: response.status,
    headers: responseHeaders,
    data,
  };
}

/**
 * Helper: Make a GET request
 */
export async function gitlabGet(
  path: string,
  params?: Record<string, string | number | boolean>,
): Promise<GitLabResponse> {
  return gitlabRequest({ method: 'GET', path, params });
}

/**
 * Helper: Make a POST request
 */
export async function gitlabPost(
  path: string,
  body?: any,
  params?: Record<string, string | number | boolean>,
): Promise<GitLabResponse> {
  return gitlabRequest({ method: 'POST', path, body, params });
}

/**
 * Helper: Make a PUT request
 */
export async function gitlabPut(
  path: string,
  body?: any,
  params?: Record<string, string | number | boolean>,
): Promise<GitLabResponse> {
  return gitlabRequest({ method: 'PUT', path, body, params });
}

/**
 * Helper: Make a DELETE request
 */
export async function gitlabDelete(
  path: string,
  params?: Record<string, string | number | boolean>,
): Promise<GitLabResponse> {
  return gitlabRequest({ method: 'DELETE', path, params });
}
