
export const fetchGithubCode = async (url: string, token?: string): Promise<string> => {
  if (!url) throw new Error("URL is required");

  // Helper to create headers with optional auth
  const createHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Helper: Basic file extension check to filter out non-code assets
  const isCodeFile = (path: string) => {
    const ignoredExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', 
      '.lock', '.json', '.md', '.txt', '.css', '.map', '.mp4', '.mp3', 
      '.wav', '.woff', '.woff2', '.ttf', '.eot', '.csv', '.xml'
    ];
    const ignoredEndings = ['.min.js', '.min.css', '.bundle.js', '-lock.yaml'];
    
    const lower = path.toLowerCase();
    if (ignoredExtensions.some(ext => lower.endsWith(ext))) return false;
    if (ignoredEndings.some(end => lower.endsWith(end))) return false;
    
    return true;
  };

  const isIgnoredDir = (path: string) => {
    const ignoredDirs = [
      'node_modules', 'dist', 'build', '.git', '.github', 'coverage', 
      '__pycache__', 'venv', 'bin', 'obj', 'vendor', 'public/assets'
    ];
    return ignoredDirs.some(dir => path.includes(dir));
  };

  try {
    const headers = createHeaders();
    
    // 1. Handle Single File (Blob) or Gist
    if (url.includes('/blob/') || url.includes('gist.github.com')) {
      let rawUrl = url;
      if (url.includes('github.com') && !url.includes('gist.github.com')) {
        rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      } else if (url.includes('gist.github.com')) {
        rawUrl = url.replace('gist.github.com', 'gist.githubusercontent.com') + '/raw';
      }
      
      const response = await fetch(rawUrl, { headers: token ? { 'Authorization': `Bearer ${token}` } : undefined });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File not found. ${token ? 'Check if the URL is correct.' : 'It might be private - add a GitHub token to access.'}`);
        }
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return await response.text();
    }

    // 2. Handle Repository Root
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    
    if (parts.length < 2) throw new Error("Invalid GitHub Repository URL. Format should be https://github.com/owner/repo");
    
    const owner = parts[0];
    const repo = parts[1];
    
    // Step A: Get Repo Info
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    
    if (repoInfoRes.status === 403) throw new Error("GitHub API rate limit exceeded. Please try again later or add a GitHub token for higher limits.");
    if (repoInfoRes.status === 404) {
      throw new Error(`Repository not found. ${token ? 'Check if the URL is correct and you have access.' : 'It might be private - add a GitHub token to access.'}`);
    }
    if (!repoInfoRes.ok) throw new Error(`GitHub API Error: ${repoInfoRes.statusText}`);
    
    const repoInfo = await repoInfoRes.json();
    const branch = repoInfo.default_branch || 'main';

    // Step B: Get File Tree (Recursive)
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
    
    if (!treeRes.ok) throw new Error("Failed to fetch repository structure.");
    
    const treeData = await treeRes.json();
    
    if (treeData.truncated) {
        console.warn("Repository is too large, file tree was truncated.");
    }

    // CONSTANTS FOR LIMITS
    const MAX_FILES = 20;
    const MAX_SINGLE_FILE_SIZE = 150000; // 150KB limit per file (skips huge minified files)
    const MAX_TOTAL_CHARS = 800000; // ~200k tokens limit for context safety

    // Step C: Filter for Code Files
    // We prioritize files closer to root (shorter path length usually) or standard source dirs
    const sortedFiles = treeData.tree
      .filter((node: any) => 
        node.type === 'blob' && 
        isCodeFile(node.path) && 
        !isIgnoredDir(node.path) &&
        (node.size === undefined || node.size < MAX_SINGLE_FILE_SIZE)
      );

    if (sortedFiles.length === 0) throw new Error("No suitable source code files found in this repository.");

    // Step D: Fetch Content
    let currentTotalChars = 0;
    let fetchedFileCount = 0;
    const fileContents: string[] = [];

    // For private repos, we need to use the API instead of raw.githubusercontent.com
    const fetchFileContent = async (filePath: string): Promise<string | null> => {
      if (token) {
        // Use GitHub API for private repos (returns base64 encoded content)
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
        try {
          const res = await fetch(apiUrl, { headers });
          if (res.ok) {
            const data = await res.json();
            if (data.content && data.encoding === 'base64') {
              return atob(data.content.replace(/\n/g, ''));
            }
          }
        } catch (e) {
          console.warn(`API fetch failed for ${filePath}`, e);
        }
        return null;
      } else {
        // Use raw.githubusercontent.com for public repos (faster)
        const rawFileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        try {
          const res = await fetch(rawFileUrl);
          if (res.ok) {
            return await res.text();
          }
        } catch (e) {
          console.warn(`Raw fetch failed for ${filePath}`, e);
        }
        return null;
      }
    };

    // Take top N files, but stop if size limit is reached
    for (const file of sortedFiles) {
      if (fetchedFileCount >= MAX_FILES) break;
      if (currentTotalChars >= MAX_TOTAL_CHARS) break;

      const text = await fetchFileContent(file.path);
      if (text) {
        // Double check size after fetch (in case API size was missing)
        if (text.length > MAX_SINGLE_FILE_SIZE) continue;

        fileContents.push(`\n\n--- START OF FILE: ${file.path} ---\n${text}\n--- END OF FILE: ${file.path} ---\n`);
        
        currentTotalChars += text.length;
        fetchedFileCount++;
      }
    }

    const result = `// Repository: ${owner}/${repo}${repoInfo.private ? ' (Private)' : ''}\n// Analyzed Files: ${fetchedFileCount}\n// Truncated: ${currentTotalChars >= MAX_TOTAL_CHARS ? 'Yes (Size Limit)' : 'No'}\n` + fileContents.join('');
    
    if (result.length < 50) {
        throw new Error("Failed to retrieve any file content from this repository.");
    }

    return result;

  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch from GitHub.");
  }
};
