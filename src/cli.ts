#!/usr/bin/env node

import ora from 'ora';
import cac, { CAC } from 'cac';
import { promisify } from 'util';
import { resolve } from 'path';
import { exec } from 'child_process'
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import prompts, { PromptObject } from 'prompts';

import { cwd, tips, colors, logger } from './util';
import { KOKKORO_UPDAY, KOKKORO_VERSION } from './help';

const { cyan } = colors;
const { error, info, success, warn } = tips;

const config_path = resolve(cwd, 'kkrconfig.json');
const cli = cac('kokkoro').help().version(KOKKORO_VERSION);
const questions: PromptObject[] = [
  {
    type: 'number',
    name: 'uin',
    message: 'Your bot QQ number',
    validate: value => /^[1-9][0-9]{4,12}$/.test(value) ? true : `The QQ number is not compliant`
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
    validate: value => value < 1 || value > 65535 ? `Please enter a number between 1-65535` : true
  },
  {
    type: 'multiselect',
    name: 'plugins',
    message: 'Select the plugins to load',
    choices: [
      { title: 'kokkoro-plugin-og', value: 'kokkoro-plugin-og', description: '发送网页 html 的 og 信息' },
      { title: 'kokkoro-plugin-gvg', value: 'kokkoro-plugin-gvg', description: '会战插件（我不想打公会战）', disabled: true },
      { title: 'kokkoro-plugin-setu', value: 'kokkoro-plugin-setu', description: 'hso，我都不看这些的' },
      { title: 'kokkoro-plugin-gobang', value: 'kokkoro-plugin-gobang', description: '五子棋小游戏', disabled: true },
      { title: 'kokkoro-plugin-hitokoto', value: 'kokkoro-plugin-hitokoto', description: '每日一言（才不是网抑云）', disabled: true },
    ],
    warn: '- 近期重构中，当前插件暂时不可用',
  }
];

(function init(cli: CAC) {
  cli
    .command('init', 'initialize kokkoro config file')
    .option('-f, --forced', 'overwrite config file if it exists')
    .action(async (options?) => {
      if (!options.forced && existsSync(config_path)) {
        console.warn(`${error} config file already exists. If you want to overwrite the current file, use ${cyan('kokkoro init -f')}`);
        process.exit(1);
      }

      const response = await prompts.prompt(questions, {
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
            masters: masters.map(Number), auto_login: true, prefix: '>', platform: 5, log_level: 'info'
          }
        }
      };

      writeFile(`kkrconfig.json`, `${JSON.stringify(config, null, 2)}`)
        .then(async () => {
          console.log(`\n${success} created config file ${cyan(`'${config_path}'`)}`);

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
              i === plugin_length - 1 && console.warn(`\n${warn} npm package was not installed successfully`);
            }
          }
        })
        .catch((err) => {
          console.warn(`\n${error} ${err.message}`);
          process.exit(0);
        })
    })
})(cli);

(function start(cli: CAC) {
  cli
    .command('start', 'kokkoro bot link start')
    .action(async () => {
      if (!existsSync(config_path)) {
        console.warn(`${error} config file is not exists. If you want to create the file, use ${cyan('kokkoro init')}\n`);

        process.exit(1);
      }

      // Acsii Font Name: Mini: http://patorjk.com/software/taag/
      const wellcome: string = `-------------------------------------------------------------------------------------

        \\    / _  | |  _  _  ._ _   _    _|_  _    |   _  |  |   _  ._ _  
         \\/\\/ (/_ | | (_ (_) | | | (/_    |_ (_)   |< (_) |< |< (_) | (_)

-------------------------------------------------------------------------------------`;
      console.log(cyan(wellcome))

      logger.mark(`----------`);
      logger.mark(`Package Version: kokkoro@${KOKKORO_VERSION} (Released on ${KOKKORO_UPDAY})`);
      logger.mark(`View Changelogs：https://github.com/dcyuki/kokkoro/releases`);
      logger.mark(`----------`);
      logger.mark(`项目启动完成，开始登录账号`);

      require('./startup');
    })
})(cli);

cli.parse();
!cli.matchedCommand && cli.outputHelp();