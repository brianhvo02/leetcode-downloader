import { problemQuery } from './queries.js';
import { __dirname, init, languageExtensions, markdownTemplate } from './utils.js';
import { join } from 'path';
import { writeFile, mkdir } from 'node:fs/promises';
import _ from 'lodash';


(async () => {
    const { queryFetch, interpretSolution } = await init();

    const problems = await queryFetch(problemQuery({ limit: 1 }));
    
    // await Promise.all(problems.problemsetQuestionList.questions.map(async problem => {
    //     const dir = join(__dirname, 'problems', `${problem.questionId}-${problem.titleSlug}`);
    //     const src = join(dir, 'src');
    //     const dist = join(dir, 'out');
    //     await mkdir(src, { recursive: true });
    //     await mkdir(dist, { recursive: true });
    //     writeFile(join(dir, 'README.md'), markdownTemplate(problem));
    //     problem.codeSnippets.forEach(snippet => writeFile(join(src, `${snippet.langSlug}${languageExtensions[snippet.langSlug]}`), snippet.code));
    // }));

    // const problem = problems.problemsetQuestionList.questions[0];
    // console.log(problem)
    const { questionId, titleSlug, metaData, testCases } = problems.problemsetQuestionList.questions[0];
    const lang = 'javascript';

    const data = await interpretSolution(questionId, titleSlug, lang, testCases.join('\n'));
    console.log(data)
})();