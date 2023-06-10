import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import { emitKeypressEvents } from 'readline';
import { problemQuery } from './queries.js';
import { __dirname, init, languageExtensions, markdownTemplate } from './utils.js';
import { join } from 'path';
import { writeFile, mkdir } from 'node:fs/promises';

emitKeypressEvents(input);

const phases = {
    'landing': [
        'Generate problem(s)',
        'Check solution'
    ],
    'problems': [
        'One problem',
        'Range of problems (e.g. #10-#30)',
        'Random problem'
    ],
    'problem_one': 'What problem number did you want to download?'
}

const nextPhase = (phase, option) => 
    phase === 'landing'
        ? option === 0
            ? 'problems'
            : 'solution'
        : phase === 'problems'
            ? option === 0
                ? 'problem_one'
                : option === 1
                    ? 'problem_range'
                    : 'problem_random'
            : '';

const renderHeader = () => {
    output.write('\u001B[?25l');
    output.cursorTo(0, 0);
    output.clearScreenDown();
    output.write(chalk.blue('LeetCode CLI v0.0.1'));
    output.write('\n\n');
}

const renderEnd = (skipWipe = false) => {
    if (!skipWipe) {
        output.cursorTo(0, 0);
        output.clearScreenDown();
    }
    
    output.write('\u001B[?25h');
    input.pause();
}

let phase = 'landing',
    option = 0,
    answer = [];

const selected = [];

const renderOptions = options => {
    output.cursorTo(0, 2);
    output.clearScreenDown();
    selected.forEach(line => output.write(chalk.cyan.bold(line) + '\n'));
    output.write(chalk.underline('Select one of the following'));
    options.forEach((option, i) => output.write('\n' + (i === 0  ? chalk.green(option) : option)));
    output.cursorTo(0, selected.length + 3);
}

const renderReader = prompt => {
    output.cursorTo(0, 2);
    output.clearScreenDown();
    selected.forEach(line => output.write(chalk.cyan.bold(line) + '\n'));
    answer.length = 0;
    output.write(chalk.green(prompt));
    output.cursorTo(0, selected.length + 3);
    output.write('\u001B[?25h');
}

const handleReader = ans => {
    switch (phase) {
        case 'problem_one':
            const number = parseInt(ans);
            if (!number) {
                output.cursorTo(0, selected.length + 3);
                output.clearScreenDown();
                output.write(chalk.red(`"${chalk.white(ans)}" is not a number.`));
                output.cursorTo(0, selected.length + 4);
                answer.length = 0;
                return;
            }
            init().then(({ queryFetch }) => queryFetch(problemQuery({
                skip: number - 1,
                limit: 1,
            }))).then(async problems => {
                const problem = problems.problemsetQuestionList.questions[0];
                const dir = join(__dirname, 'problems', `${problem.questionId}-${problem.titleSlug}`);
                const src = join(dir, 'src');
                const dist = join(dir, 'dist');
                await mkdir(src, { recursive: true });
                await mkdir(dist, { recursive: true });
                await writeFile(join(dir, 'README.md'), markdownTemplate(problem));
                await Promise.all(problem.codeSnippets.map(snippet => writeFile(join(src, `${snippet.langSlug}${languageExtensions[snippet.langSlug]}`), snippet.code)));
                output.cursorTo(0, 2);
                output.clearScreenDown();
                output.write(`Successfully downloaded ${chalk.green(`${problem.questionId}. ${problem.title}`)}\n`);
                renderEnd(true);
            })
    }
}

export const render = () => {
    input.on('keypress', (ch, key) => {
        if (key && key.ctrl && key.name == 'c') {
            renderEnd();
        } else {
            const current = phases[phase];
            switch (key.name) {
                case 'up':
                    if (Array.isArray(current) && option > 0) {
                        output.write(current[option]);
                        option--;
                        output.cursorTo(0, option + selected.length + 3);
                        output.write(chalk.green(current[option]));
                        output.cursorTo(0, option + selected.length + 3);
                    }
                    break;
                case 'down':
                    if (Array.isArray(current) && option < current.length - 1) {
                        output.write(current[option]);
                        option++;
                        output.cursorTo(0, option + selected.length + 3);
                        output.write(chalk.green(current[option]));
                        output.cursorTo(0, option + selected.length + 3);
                    }
                    break;
                case 'return':
                    if (Array.isArray(current)) {
                        selected.push(current[option]);
                        phase = nextPhase(phase, option);
                        Array.isArray(phases[phase])
                            ? renderOptions(phases[phase])
                            : renderReader(phases[phase])
                        option = 0;
                    } else {
                        output.write('\u001B[?25l');
                        handleReader(answer.join(''));
                    }
                    
                    break;
                default:
                    if (Array.isArray(current)) {
                        output.cursorTo(20, 0);
                        output.clearLine(1);
                        output.write(key.name);
                        output.cursorTo(0, option + selected.length + 3);
                    } else {
                        answer.push(key.sequence);
                        output.write(key.sequence);
                    }
            }
        }
    });
    
    input.setRawMode(true);
    input.resume();
    
    renderHeader();
    renderOptions(phases[phase]);
}
