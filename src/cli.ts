#!/usr/bin/env node

import ora from 'ora'
import cac, { CAC } from 'cac'
import { resolve } from 'path'


import { existsSync } from 'fs'
import { promisify } from 'util'
import { exec } from 'child_process'
import { writeFile } from 'fs/promises'
import { prompt, PromptObject } from 'prompts'
import { cwd, info, warn, error, success, cyan } from './util'

import help from './help'
import * as util from './util'

const questions: PromptObject[] = [
  {
    type: 'number',
    name: 'uin',
    message: 'Your bot QQ number',
    validate: val => /^[1-9][0-9]{4,12}$/.test(val) ? true : `The QQ number is not compliant`
  },
  {
    type: 'list',
    name: 'masters',
    message: 'Your master\'s QQ number'
  },
  {
    type: 'number',
    name: 'port',
    message: 'Kokkoro serve port',
    initial: 2333,
    validate: val => val < 1 || val > 65535 ? `Please enter a number between 1-65535` : true
  },
  {
    type: 'multiselect',
    name: 'plugins',
    message: 'Select the plugins to load',
    choices: [
      { title: 'kokkoro-plugin-setu', value: 'kokkoro-plugin-setu', disabled: true },
      { title: 'kokkoro-plugin-gobang', value: 'kokkoro-plugin-gobang', disabled: true },
      { title: 'kokkoro-plugin-hitokoto', value: 'kokkoro-plugin-hitokoto', disabled: true }
    ],
    warn: '- 近期重构中，当前插件暂时不可用',
  }
];

function init(cli: CAC) {
  cli
    .command('init', 'initialize kokkoro config file')
    .option('-f, --forced', 'overwrite config file if it exists')
    .action(async (options?) => {
      const path = resolve(cwd, 'kokkoro.config.js');

      if (!options.forced && existsSync(path)) {
        console.warn(`${error} config file already exists. If you want to overwrite the current file, use ${cyan('kokkoro init -f')}`);

        process.exit(1);
      }
      const response = await prompt(questions, {
        onCancel: () => {
          console.log(`\n${info} config file generation has been aborted\n`);
          process.exit(1);
        },
      });

      const { uin, masters, port, plugins } = response;
      const config = {
        port,
        bots: {
          [uin]: {
            masters: masters.map(Number), autologin: true, prefix: '>', platform: 5, log_level: 'info'
          }
        }
      };

      writeFile(
        `kokkoro.config.js`,
        `module.exports = ${JSON.stringify(config, null, 2).replace(/"([^"]+)":/g, '$1:')}`
      )
        .then(async () => {
          console.log(`\n${success} created config file ${cyan(`'${path}'`)}`);

          const all_plugin = ['kokkoro', ...plugins];
          const plugin_length = all_plugin.length;

          for (let i = 0; i < plugin_length; i++) {
            const plugin = all_plugin[i];
            const spinner = ora(`Install ${plugin}`).start();
            const promiseExec = promisify(exec);

            try {
              await promiseExec(`npm i -D ${plugin}`);
              spinner.succeed();
              i === plugin_length - 1 && console.log(`\n${success} project is initialized successfully`);
            } catch (error) {
              spinner.fail();
              i === plugin_length - 1 && console.warn(`\n${warn} npm package was not installed successfully`)
            }
          }
        })
        .catch((err) => {
          console.warn(`\n${error} ${err.message}`);
          process.exit(0);
        })
    })
}

function start(cli: CAC) {
  cli
    .command('start', 'kokkoro bot link start')
    .action(() => {
      const path = resolve(cwd, 'kokkoro.config.js');

      if (!existsSync(path)) {
        console.warn(`${error} config file is not exists. If you want to create the file, use ${cyan('kokkoro init')}\n`);

        process.exit(1);
      }

      // Acsii Font Name: Mini: http://patorjk.com/software/taag/
      const wellcome: string = `--------------------------------------------------------------------------------------------
                                                                             _          
      \\    / _  | |  _  _  ._ _   _    _|_  _    \\_/    ._ _   _  ._ _  o   |_)  _ _|_ 
       \\/\\/ (/_ | | (_ (_) | | | (/_    |_ (_)    | |_| | | | (/_ | | | |   |_) (_) |_ 
--------------------------------------------------------------------------------------------`;
      console.log('\x1B[36m%s\x1B[0m', wellcome);

      util.logger.level = 'all';
      util.logger.mark(`----------`);
      util.logger.mark(`Package Version: kokkoro@${help.KOKKORO_VERSION} (Released on 2021/8/15)`);
      util.logger.mark(`View Changelogs：https://docs.kokkoro.moe/#/changelog/`);
      util.logger.mark(`----------`);
      util.logger.mark(`项目启动完成，开始登录账号`);

      require('./startup');
    })
}

const cli = cac('kokkoro').help().version(help.KOKKORO_VERSION);

init(cli);
start(cli);

cli.parse();
!cli.matchedCommand && cli.outputHelp();