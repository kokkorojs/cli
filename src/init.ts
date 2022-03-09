import ora from 'ora';
import { CAC } from 'cac';
import { existsSync } from 'fs';
import { stringify } from 'yaml';
import { promisify } from 'util';
import { exit } from 'process';
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
      { title: 'kokkoro-core', value: 'kokkoro-core', description: 'kokkoro 核心包', selected: true, },
      { title: 'kokkoro-bilibili', value: 'kokkoro-bilibili', description: '哔哩哔哩 (゜-゜)つロ 干杯~-bilibili', },
      { title: 'kokkoro-gobang', value: 'kokkoro-gobang', description: '五子棋小游戏', disabled: true, },
      { title: 'kokkoro-guild', value: 'kokkoro-guild', description: '公会插件（我不想打公会战）', },
      { title: 'kokkoro-hitokoto', value: 'kokkoro-hitokoto', description: '每日一言（才不是网抑云）', },
      { title: 'kokkoro-setu', value: 'kokkoro-setu', description: 'hso，我都不看这些的', },
      { title: 'kokkoro-sandbox', value: 'kokkoro-sandbox', description: '将收到的消息当做代码在沙盒中执行，并返回结果', },
      { title: 'kokkoro-web', value: 'kokkoro-web', description: '为 kokkoro 提供 web 及路由支持', disabled: true, },
    ],
    warn: '- 近期移植中，当前插件暂时不可用',
  }
];
const onCancel = () => {
  console.log(`${TIP_INFO} config file generation has been aborted\n`);
  exit(0);
}
const main_template = `const { startup } = require('kokkoro-core');

startup();`;

export default function (cli: CAC) {
  cli
    .command('init', 'initialize kokkoro config file')
    .option('-f, --forced', 'overwrite config file if it exists')
    .action(async options => {
      if (!options.forced && existsSync(config_path)) {
        console.warn(`${TIP_ERROR} config file already exists. If you want to overwrite the current file, use ${colors.cyan('kokkoro init -f')}\n`);
        exit(1);
      }

      const response = await prompts(questions, { onCancel });
      const { uin, masters, port, plugins } = response;
      const kokkoro_config = {
        port,
        bots: {
          [uin]: {
            prefix: '>',
            auto_login: true,
            login_mode: 'qrcode',
            masters: masters.map(Number),
            config: {
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

        if (!existsSync(plugins_path)) {
          await mkdir(plugins_path);
        }

        console.log(`${TIP_SUCCESS} created config file ${colors.cyan(config_path)}\n`);

        const promiseExec = promisify(exec);
        const plugin_length = plugins.length;

        let install_success = true;
        let install_message = `${TIP_SUCCESS} project is initialized successfully\n`;

        for (let i = 0; i < plugin_length; i++) {
          const plugin_name = plugins[i];
          const spinner = ora(`Install ${plugin_name}`).start();
          const command = `npm i ${plugin_name} --registry=https://registry.npm.taobao.org`;

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

          if (i === plugin_length - 1) {
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