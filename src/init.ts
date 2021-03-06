import ora from 'ora';
import { exit } from 'process';
import { existsSync } from 'fs';
import { stringify } from 'yaml';
import { promisify } from 'util';
import { Command } from 'commander';
import { exec } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import prompts, { PromptObject } from 'prompts';

import { colors, config_path, plugins_path, TIP_ERROR, TIP_INFO, TIP_SUCCESS, TIP_WARN } from '.';

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
    message: 'Kokkoro web serve port',
    initial: 0,
    min: 0,
    max: 65535,
  },
  {
    type: 'multiselect',
    name: 'plugins',
    message: 'Select the plugins to load',
    choices: [
      { title: 'rsshub', value: 'kokkoro-plugin-rsshub', description: 'RSS 订阅推送', },
      { title: 'gobang', value: 'kokkoro-plugin-gobang', description: '五子棋小游戏', disabled: true, },
      { title: 'group', value: 'kokkoro-plugin-group', description: '群管理，时不时来塞口球', },
      { title: 'guild', value: 'kokkoro-plugin-guild', description: '公会插件（我不想打公会战）', },
      { title: 'hitokoto', value: 'kokkoro-plugin-hitokoto', description: '每日一言（才不是网抑云）', },
      { title: 'saucenao', value: 'kokkoro-plugin-saucenao', description: 'Locating image sources', },
      { title: 'setu', value: 'kokkoro-plugin-setu', description: 'hso，我都不看这些的', },
      { title: 'sandbox', value: 'kokkoro-plugin-sandbox', description: '将收到的消息当做代码在沙盒中执行，并返回结果', disabled: true, },
    ],
    warn: '- 近期移植中，当前插件暂时不可用',
  }
];
const onCancel = () => {
  console.log(`${TIP_INFO} config file generation has been aborted\n`);
  exit(0);
}
const main_template = `const { startup } = require('kokkoro');

startup();`;

export default function (program: Command) {
  program
    .command('init')
    .description('initialize kokkoro config file')
    .option('-f, --forced', 'overwrite config file if it exists')
    .action(async options => {
      if (!options.forced && existsSync(config_path)) {
        console.warn(`${TIP_ERROR} config file already exists. If you want to overwrite the current file, use ${colors.cyan('kokkoro init -f')}\n`);
        exit(1);
      }

      const response = await prompts(questions, { onCancel });
      const { uin, masters, port, plugins } = response;
      const kokkoro_config = {
        api_key: {},
        port,
        bots: {
          [uin]: {
            auto_login: true,
            mode: 'qrcode',
            masters: masters.map(Number),
            protocol: {
              log_level: 'info',
              platform: 1,
              ignore_self: true,
              resend: true,
              data_dir: './data/bot',
              reconn_interval: 5,
              cache_group_member: true,
              auto_server: true,
            }
          }
        }
      };

      try {
        await writeFile(`main.js`, main_template);
        await writeFile(`kokkoro.yml`, stringify(kokkoro_config));

        if (!existsSync(plugins_path)) { await mkdir(plugins_path); }

        console.log(`${TIP_SUCCESS} created config file ${colors.cyan(config_path)}\n`);

        const promiseExec = promisify(exec);
        const modules = ['@kokkoro/jsondb', 'kokkoro', ...plugins];
        const modules_length = modules.length;

        let install_success = true;
        let install_message = `${TIP_SUCCESS} project is initialized successfully\n`;

        for (let i = 0; i < modules_length; i++) {
          const module = modules[i];
          const spinner = ora(`Install ${module}`).start();
          const command = `npm i ${module} --registry=https://registry.npm.taobao.org`;

          await promiseExec(command)
            .then(() => {
              spinner.succeed();
            })
            .catch(() => {
              spinner.fail();

              if (install_success) {
                install_success = false;
                install_message = `${TIP_WARN} npm package was not installed successfully\n`;
              }
            })

          if (i === modules_length - 1) {
            console.log(install_message);
          }
        }
      } catch (error) {
        const { message } = error as Error;
        console.warn(`\n${TIP_ERROR} ${message}`);
        exit(1);
      }
    })
}
