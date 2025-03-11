export  async function uploadToGithub(
  repoName: string,
  token: string,
  files: File[]
): Promise<void> {
  try {
    const repoCheckResponse = await fetch(
      `https://whooks-dev.jdoodle.io/proxy?url=https://api.github.com/repos/${repoName}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!repoCheckResponse.ok) {
      if (repoCheckResponse.status === 404) {
        throw new Error(`Repository "${repoName}" not found. Please check if the repository exists and the name is correct.`);
      } else if (repoCheckResponse.status === 401) {
        throw new Error('Invalid token. Please check if your token is correct and not expired.');
      } else if (repoCheckResponse.status === 403) {
        throw new Error('Insufficient permissions. Make sure your token has the "repo" scope.');
      }
      throw new Error('Failed to verify repository access. Please check repository name and token.');
    }

    const baseUrl = `https://whooks-dev.jdoodle.io/proxy?url=https://api.github.com/repos/${repoName}/contents`;
    
    const uploads = files.map(async (file) => {
      try {
        // Read file content as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64 in chunks to avoid call stack issues
        const chunkSize = 32768;
        let binary = '';
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        const base64Content = btoa(binary);
        
        const response = await fetch(`${baseUrl}/${file.name}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: `Upload ${file.name}`,
            content: base64Content,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `Failed to upload ${file.name}`);
        }

        return await response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Unknown error occurred while uploading ${file.name}`);
      }
    });

    await Promise.all(uploads);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}
 