// #!/usr/bin/env node

// import ora from 'ora';

import cac from 'cac';
// import { promisify } from 'util';
import { resolve } from 'path';
import { cwd } from 'process';
// import { exec, spawn } from 'child_process';

// import { writeFile, mkdir } from 'fs/promises';

import init from './init';

const cli = cac('kokkoro');

const WORK_PATH = cwd();
const VERSION = require('../package.json').version;
export const CONFIG_PATH = resolve(WORK_PATH, 'kokkoro.yml');

/**
 * 控制台彩色打印
 * 
 * @param code - ANSI escape code
 * @returns - function
 */
function colorful(code: number): Function {
  return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`
}

export const colors = {
  red: colorful(31), green: colorful(32), yellow: colorful(33),
  blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};

export const TIP_INFO = colors.cyan('Info:');
export const TIP_ERROR = colors.red('Error:');
export const TIP_WARN = colors.yellow('Warn:');
export const TIP_SUCCESS = colors.green('Success:');


init(cli);

cli.help();
cli.version(VERSION);
cli.parse();





// (function init(cli: CAC) {
//   cli
//     .command('init', 'initialize kokkoro config file')
//     .option('-f, --forced', 'overwrite config file if it exists')
//     .action(async (options?) => {
//       if (!options.forced && existsSync(config_path)) {
//         console.warn(`${error} config file already exists. If you want to overwrite the current file, use ${colors.cyan('kokkoro init -f')}`);
//         process.exit(1);
//       }

//       const response = await prompts.prompt(questions, {
//         onCancel: () => {
//           console.log(`\n${info} config file generation has been aborted\n`);
//           process.exit(1);
//         },
//       });

//       const { uin, master, port, plugins } = response;
//       const kokkoro_config = {
//         port,
//         bots: {
//           [uin]: {
//             prefix: '>',
//             auto_login: true,
//             login_mode: 'qrcode',
//             master: master.map(Number),
//             config: {
//               log_level: 'info',
//               platform: 1,
//               ignore_self: true,
//               resend: true,
//               data_dir: './data/bots',
//               reconn_interval: 5,
//               cache_group_member: true,
//               auto_server: true,
//             }
//           }
//         }
//       };

//       try {
//         await writeFile(`kokkoro.yml`, dump(kokkoro_config));
//         await writeFile(`index.js`, `const { linkStart } = require('kokkoro-core');\nlinkStart();`);

//         !existsSync(join(work_path, `/plugins`)) && await mkdir(join(work_path, `/plugins`));

//         console.log(`\n${success} created config file ${colors.cyan(config_path)}`);

//         const promiseExec = promisify(exec);
//         const all_plugin = ['kokkoro-core', ...plugins];
//         const plugin_length = all_plugin.length;

//         for (let i = 0; i < plugin_length; i++) {
//           const plugin = all_plugin[i];
//           const spinner = ora(`Install ${plugin}`).start();

//           try {
//             await promiseExec(`npm i ${plugin} --registry=https://registry.npm.taobao.org`);
//             spinner.succeed();
//             i === plugin_length - 1 && console.log(`\n${success} project is initialized successfully`);
//           } catch (error) {
//             spinner.fail();
//             i === plugin_length - 1 && console.warn(`\n${warn} npm package was not installed successfully`);
//           }
//         }
//       } catch (err) {
//         console.warn(`\n${error} ${err}`);
//         process.exit(0);
//       }
//     })
// })(cli);

// (function start(cli: CAC) {
//   cli
//     .command('start', 'kokkoro bot startup')
//     .action(() => {
//       if (!existsSync(config_path)) {
//         console.warn(`${error} config file is not exists. If you want to create the file, use ${colors.cyan('kokkoro init')}\n`);

//         process.exit(1);
//       }

//       const node = spawn('node', ['index.js'], { stdio: 'inherit' });

//       node.stdout?.on('data', data => {
//         console.log(data.toString());
//       });

//       node.stderr?.on('data', data => {
//         console.error(data.toString());
//       });

//       node.on('close', code => {
//         console.log(`child process exited with code ${code}`);
//       });
//     })
// })(cli);

// cli.parse();
// !cli.matchedCommand && cli.outputHelp();