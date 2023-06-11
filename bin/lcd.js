#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { render } from '../console.js';
import { authenticateUser, init, isAuthenticated, writeProblem } from '../utils.js';
import chalk from 'chalk';
import { problemQuery } from '../queries.js';

const {
    values: { authenticate, interactive, generate, check, help },
    positionals
} = parseArgs({
    options: {
        authenticate: {
            type: 'boolean',
            short: 'a'
        },
        interactive: {
            type: 'boolean',
            short: 'i'
        },
        generate: {
            type: 'string',
            short: 'g'
        },
        check: {
            type: 'boolean',
            short: 'c'
        },
        help: {
            type: 'boolean',
            short: 'h'
        }
    },
    allowPositionals: true
});

console.log(chalk.blue('LeetCode CLI v0.0.1'))

if (help || !(interactive || generate || check || authenticate)) {
    console.log(
`NAME
    lcd - LeetCode problems downloader/checker

SYNOPSIS
    ${chalk.bold('lcd')} [${chalk.italic('OPTION')}]... [${chalk.italic('PROBLEM_NUMBER')}]...

DESCRIPTION
    Download problems and check solutions from LeetCode locally.

    Mandatory arguments to long options are mandatory for short options too.

    ${chalk.bold('-a, --authenticate')}
        authenticate using the browser

    ${chalk.bold('-i, --interactive')}
        enter interactive mode

    ${chalk.bold('-g, --generate')} ${chalk.italic('OPTION')}
        generate problems from LeetCode
        ${chalk.italic('OPTION')} - one
            TODO: range, random
    
    ${chalk.bold('-c, --check')}
        check solution with included test cases
        ${chalk.red('REQUIRES AUTHENTICATION, SEE BELOW')}

    ${chalk.bold('-h, --help')}
        displays this help menu

AUTHENTICATION
    To use the LeetCode's solution checker, you must be logged in.
    Please log in by doing one of the following: 
    1. ${chalk.underline('Using environment variables')}
       Set the ${chalk.green('LEETCODE_USERNAME')} and ${chalk.green('LEETCODE_PASSWORD')} environment variables,
       either by using a ${chalk.italic('.env')} file or by setting them on the command line.
    2. ${chalk.underline('Logging in using the browser')}
       Pass in the -a or --authenticate option to authenticate.

AUTHOR
    Written by Brian Vo

REPORTING BUGS
    Report any issues at https://github.com/brianhvo02/leetcode-downloader/issues

COPYRIGHT
    Copyright © 2023 Brian Vo. License GPLv3+:
    GNU GPL version 3 or later <https://gnu.org/licenses/gpl.html>.
    This is free software: you are free to change and redistribute it.
    There is NO WARRANTY, to the extent permitted by law.
`
    );
} else if (authenticate) {
    await authenticateUser();
    console.log(chalk.green('Authentication successful'));
} else {
    init().then(async methods => {
        const { queryFetch, getSolution } = methods;
        if (generate) {
            switch (generate) {
                case 'one':
                    const num = parseInt(positionals[0]);
                    if (num) {
                        const query = problemQuery({
                            skip: num - 1,
                            limit: 1,
                        });
        
                        const problems = await queryFetch(query);
                        const problem = problems.problemsetQuestionList.questions[0];
                        const { questionId, title } = problem;
                        await writeProblem(problem);
                        console.log(`Successfully downloaded ${chalk.green(`${questionId}. ${title}`)}`);
                    } else {
                        console.log('Value given not a number!');
                    }
                    break;
                default:
                    console.log('Invalid value for --generate');
            }
        } else if (check) {
            if (!isAuthenticated()) {
                console.log(
`To use the LeetCode's solution checker, you must be logged in.
Please log in by doing one of the following: 
1. Using environment variables - Set the ${chalk.green('LEETCODE_USERNAME')} and ${chalk.green('LEETCODE_PASSWORD')} environment variables,
    either by using a ${chalk.italic('.env')} file or by setting them on the command line.
2. Logging in using the browser - pass in the -a or --auth option to authenticate.`
)
                process.exit(0);
            }
            const num = parseInt(positionals[0]);
            if (num) {
                const query = problemQuery({
                    skip: num - 1,
                    limit: 1,
                });

                const problems = await queryFetch(query);
                const problem = problems.problemsetQuestionList.questions[0];
                console.log(await getSolution(problem));
            } else {
                console.log('Value given not a number!');
            }
        } else {
            render(methods);
        }
    });
}

