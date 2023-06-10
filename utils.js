import url from 'url';
export const __filename = url.fileURLToPath(import.meta.url);
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const languageExtensions = {
    c: '.c',
    csharp: '.cs',
    cpp: '.cpp',
    dart: '.dart',
    elixir: '.ex',
    erlang: '.erl',
    golang: '.go',
    java: '.java',
    javascript: '.js',
    kotlin: '.kt',
    php: '.php',
    python: '.py',
    python3: '.py',
    racket: '.rkt',
    ruby: '.rb',
    rust: '.rs',
    scala: '.scala',
    swift: '.swift',
    typescript: '.ts'
}

export const markdownTemplate = problem => `# ${problem.questionId}. ${problem.title}

https://leetcode.com/problems/${problem.titleSlug}/

## Difficulty: ${problem.difficulty}
### ${problem.topicTags.map(topic => topic.name).join(', ')}

<br>
${problem.content}
<br><br>
${problem.hints.map((hint, i) => `<details>
    <summary>Hint ${i + 1}</summary>
    ${hint}
</details>`).join('\n<br>\n')}`;

export const init = async () => {
    const { headers } = await fetch('https://leetcode.com/graphql', { method: 'HEAD' });
    const cookie = headers.get('Set-Cookie');
    const csrf = cookie.slice(cookie.indexOf('=') + 1, cookie.indexOf(';'));
    
    const queryFetch = async query => new Promise((resolve, reject) =>
        fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Csrftoken': csrf,
                'Referer': 'https://leetcode.com',
                'Cookie': cookie
            },
            body: JSON.stringify(query)
        })
        .then(res => res.json())
        .then(data => {
            if (data.errors) {
                const err = new Error(data.errors.map(error => error.message).join('\n'));
                err.errors = data.errors;
                reject(err);
            } else {
                resolve(data.data)
            }
        })
    );

    return { queryFetch };
}