import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';
import puppeteer from 'puppeteer';
import url from 'url';
import { existsSync } from 'fs';
import chalk from 'chalk';
config();

export const __filename = url.fileURLToPath(import.meta.url);
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const username = process.env.LEETCODE_USERNAME,
    password = process.env.LEETCODE_PASSWORD;

const cookieJarPath = join(__dirname, 'cookie.jar');
export const isAuthenticated = () => existsSync(cookieJarPath);


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

export const authenticateUser = async (headless = false) => {
    const browser = await puppeteer.launch({ headless });
    const page = await browser.newPage();
    
    const auth = new Promise(async resolve => {
        page.on('response', async (response) => {
            const request = response.request();
            if (request.url().includes('login') && request.method() === 'POST'){
                const cookies = response.headers()['set-cookie'];
                const csrfIndex = cookies.indexOf('csrftoken');
                await browser.close();
                const goodies = {
                    csrf: cookies.slice(csrfIndex + 10, cookies.indexOf(';', csrfIndex)),
                    cookies: cookies.replace(/\n/g, ';')
                };
                await writeFile(cookieJarPath, goodies.cookies);
                resolve(goodies);
            }
        });
    });

    await page.goto('https://leetcode.com/accounts/login', { waitUntil: 'networkidle2' });

    if (headless) {
        await page.waitForSelector('#signin_btn')
        await page.focus('input[name=login]')
        await page.keyboard.type(username)
        await page.focus('input[name=password]')
        await page.keyboard.type(password);
        await page.$eval('#signin_btn', button => button.click());
    }

    return auth;
}

export const init = async () => {
    const { csrf, cookies } = await (
        isAuthenticated()
            ? (async () => {
                const jar = await readFile(cookieJarPath);
                const cookies = jar.toString('utf-8');
                const csrfIndex = cookies.indexOf('csrftoken');
                
                return {
                    csrf: cookies.slice(csrfIndex + 10, cookies.indexOf(';', csrfIndex)),
                    cookies
                };
            })()
            : (username && password) 
                ? authenticateUser('new')
                : (async () => {
                    const { headers } = await fetch('https://leetcode.com/graphql', { method: 'HEAD' });
                    const cookies = headers.get('Set-Cookie');
                    const csrf = cookies.slice(cookies.indexOf('=') + 1, cookies.indexOf(';'));
                    return { csrf, cookies };
                })()
    );
    
    const queryFetch = async query => new Promise((resolve, reject) =>
        fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Csrftoken': csrf,
                'Referer': 'https://leetcode.com',
                'Cookie': cookies
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

    const checkInterpretResults = async (interpretId) => new Promise(async resolve => {
        const data = await fetch(`https://leetcode.com/submissions/detail/${interpretId}/check/`).then(res => res.json());
        if (['PENDING', 'STARTED'].includes(data.state)) {
            setTimeout(() => resolve(checkInterpretResults(interpretId)), 1000);
        } else {
            resolve(data);
        }
    });

    const interpretSolution = async (question_id, title_slug, lang, data_input) => new Promise(async (resolve, reject) => {
        if (!isAuthenticated()) return reject('Not authenticated');

        const file = await readFile(join(__dirname, 'problems', `${question_id}-${title_slug}`, 'src', lang + languageExtensions[lang]));
        const data = await fetch('https://leetcode.com/problems/two-sum/interpret_solution/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Csrftoken': csrf,
                'Referer': 'https://leetcode.com/problems/two-sum/description/',
                'Cookie': cookies
            },
            body: JSON.stringify({ question_id, lang, data_input, typed_code: file.toString('utf-8') })
        }).then(res => res.json());
        if (data.errors) {
            const err = new Error(data.errors.map(error => error.message).join('\n'));
            err.errors = data.errors;
            reject(err);
        } else {
            resolve(checkInterpretResults(data.interpret_id));
        }
    });

    const getSolution = async ({ questionId, title, titleSlug, testCases, metaData }) => {
        const { params } = JSON.parse(metaData);
            const lang = 'javascript';
            const {
                status_msg,
                pretty_lang,
                total_correct,
                total_testcases,
                compare_result,
                expected_code_answer,
                code_answer
            } = await interpretSolution(questionId, titleSlug, lang, testCases.join('\n'));
            const results = compare_result.split('').map(result => result === '1');
            return (
`${questionId}. ${title} - ${pretty_lang} ${checkStatus(status_msg === 'Accepted')(`(${status_msg})`)}

Test cases passed: ${checkStatus(total_correct === total_testcases)(`${total_correct}/${total_testcases}`)}

${
    (() => {
        const lines = [];
        for (let i = 0; i < total_testcases; i++) {
            const testCase = testCases[i].split('\n');
            lines.push(
`${checkStatus(results[i])(`Test Case ${i + 1}`)}
${testCase.map((param, idx) => `${params[idx].name} = ${param}`).join('\n')}
Outputed answer: ${code_answer[i]}
Expected answer: ${expected_code_answer[i]}`
            );
        }
        return lines.join('\n');
    })()
}
`
        );
    } 

    return { queryFetch, getSolution };
}

export const checkStatus = bool => bool ? chalk.green : chalk.red;

export const writeProblem = async problem => {
    const { questionId, titleSlug, codeSnippets } = problem;
    const dir = join(__dirname, 'problems', `${questionId}-${titleSlug}`);
    await writeFile(join(dir, 'README.md'), markdownTemplate(problem));
    await Promise.all(codeSnippets.map(snippet => writeFile(join(dir, `${snippet.langSlug}${languageExtensions[snippet.langSlug]}`), snippet.code)));
}