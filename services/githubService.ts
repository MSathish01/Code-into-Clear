
export const fetchGithubCode = async (url: string): Promise<string> => {
  if (!url) throw new Error("URL is required");

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
    // 1. Handle Single File (Blob) or Gist
    if (url.includes('/blob/') || url.includes('gist.github.com')) {
      let rawUrl = url;
      if (url.includes('github.com') && !url.includes('gist.github.com')) {
        rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      } else if (url.includes('gist.github.com')) {
        rawUrl = url.replace('gist.github.com', 'gist.githubusercontent.com') + '/raw';
      }
      
      const response = await fetch(rawUrl);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}. Check if the URL is correct and public.`);
      return await response.text();
    }

    // 2. Handle Repository Root
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    
    if (parts.length < 2) throw new Error("Invalid GitHub Repository URL. Format should be https://github.com/owner/repo");
    
    const owner = parts[0];
    const repo = parts[1];
    
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
    };
    
    // Step A: Get Repo Info
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    
    if (repoInfoRes.status === 403) throw new Error("GitHub API rate limit exceeded. Please try again later or use a 'raw' file URL directly.");
    if (repoInfoRes.status === 404) throw new Error("Repository not found. It might be private or the URL is incorrect.");
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

    // Take top N files, but stop if size limit is reached
    for (const file of sortedFiles) {
      if (fetchedFileCount >= MAX_FILES) break;
      if (currentTotalChars >= MAX_TOTAL_CHARS) break;

      const rawFileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
      try {
        const res = await fetch(rawFileUrl);
        if (res.ok) {
          const text = await res.text();
          
          // Double check size after fetch (in case API size was missing)
          if (text.length > MAX_SINGLE_FILE_SIZE) continue;

          fileContents.push(`\n\n--- START OF FILE: ${file.path} ---\n${text}\n--- END OF FILE: ${file.path} ---\n`);
          
          currentTotalChars += text.length;
          fetchedFileCount++;
        }
      } catch (e) {
        console.warn(`Failed to fetch ${file.path}`, e);
      }
    }

    const result = `// Repository: ${owner}/${repo}\n// Analyzed Files: ${fetchedFileCount}\n// Truncated: ${currentTotalChars >= MAX_TOTAL_CHARS ? 'Yes (Size Limit)' : 'No'}\n` + fileContents.join('');
    
    if (result.length < 50) {
        throw new Error("Failed to retrieve any file content from this repository.");
    }

    return result;

  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch from GitHub.");
  }
};
