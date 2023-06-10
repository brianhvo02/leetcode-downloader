import { problemQuery } from './queries.js';
import { __dirname, init, languageExtensions, markdownTemplate } from './utils.js';
import { join } from 'path';
import { writeFile, mkdir } from 'node:fs/promises';
import _ from 'lodash';

(async () => {
    const { queryFetch } = await init();

    const problems = await queryFetch(problemQuery({ limit: 5 }));
    
    await Promise.all(problems.problemsetQuestionList.questions.map(async problem => {
        const dir = join(__dirname, 'problems', `${problem.questionId}-${problem.titleSlug}`);
        const src = join(dir, 'src');
        const dist = join(dir, 'dist');
        await mkdir(src, { recursive: true });
        await mkdir(dist, { recursive: true });
        writeFile(join(dir, 'README.md'), markdownTemplate(problem));
        problem.codeSnippets.forEach(snippet => writeFile(join(src, `${snippet.langSlug}${languageExtensions[snippet.langSlug]}`), snippet.code));
    }));
})();