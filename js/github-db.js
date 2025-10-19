// GitHub Database Library
class GitHubDB {
    static async load(config) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${config.repo}/contents/${config.filePath}?ref=${config.branch}`,
                {
                    headers: {
                        'Authorization': `token ${config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    // File doesn't exist yet, return empty database
                    return { users: [], bugRequests: [] };
                }
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = atob(data.content); // Decode base64
            return JSON.parse(content);
        } catch (error) {
            console.error('Error loading from GitHub:', error);
            throw error;
        }
    }

    static async save(config, data) {
        try {
            // First, try to get the existing file to get its SHA
            let sha = null;
            try {
                const existingFile = await fetch(
                    `https://api.github.com/repos/${config.repo}/contents/${config.filePath}?ref=${config.branch}`,
                    {
                        headers: {
                            'Authorization': `token ${config.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (existingFile.ok) {
                    const fileData = await existingFile.json();
                    sha = fileData.sha;
                }
            } catch (error) {
                // File doesn't exist, that's fine
            }

            const content = btoa(JSON.stringify(data, null, 2)); // Encode to base64
            const commitMessage = `Update database: ${new Date().toISOString()}`;

            const response = await fetch(
                `https://api.github.com/repos/${config.repo}/contents/${config.filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${config.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: commitMessage,
                        content: content,
                        branch: config.branch,
                        sha: sha // Include SHA if updating existing file
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
            }

            return true;
        } catch (error) {
            console.error('Error saving to GitHub:', error);
            throw error;
        }
    }

    static async testConnection(config) {
        try {
            // Test by trying to access the repository
            const response = await fetch(
                `https://api.github.com/repos/${config.repo}`,
                {
                    headers: {
                        'Authorization': `token ${config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Cannot access repository: ${response.status}`);
            }

            return true;
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
}
