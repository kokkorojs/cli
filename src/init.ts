import { CAC } from 'cac';
import { dump } from 'js-yaml';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import prompts, { PromptObject } from 'prompts';

import { colors, CONFIG_PATH, TIP_ERROR, TIP_INFO } from '.';

const questions: PromptObject[] = [
  {
    type: 'number',
    name: 'uin',
    message: 'Your bot QQ number',
    validate: value => /^[1-9][0-9]{4,12}$/.test(value) ? true : `The QQ number is not compliant`
  },
  {
    type: 'list',
    name: 'master',
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
      { title: 'kokkoro-bilibili', value: 'kokkoro-bilibili', description: '哔哩哔哩 (゜-゜)つロ 干杯~-bilibili', disabled: true },
      { title: 'kokkoro-gobang', value: 'kokkoro-gobang', description: '五子棋小游戏', disabled: true },
      { title: 'kokkoro-guild', value: 'kokkoro-guild', description: '公会插件（我不想打公会战）' },
      { title: 'kokkoro-hitokoto', value: 'kokkoro-hitokoto', description: '每日一言（才不是网抑云）' },
      { title: 'kokkoro-og', value: 'kokkoro-og', description: '发送网页 html 的 og 信息', disabled: true },
      { title: 'kokkoro-setu', value: 'kokkoro-setu', description: 'hso，我都不看这些的' },
      { title: 'kokkoro-sandbox', value: 'kokkoro-sandbox', description: '将收到的消息当做代码在沙盒中执行，并返回结果' },
      { title: 'kokkoro-web', value: 'kokkoro-web', description: '为 kokkoro 提供 web 及路由支持', disabled: true },
    ],
    warn: '- 近期移植中，当前插件暂时不可用',
  }
];

export default function (cli: CAC) {
  cli
    .command('init', 'initialize kokkoro config file')
    .option('-f, --forced', 'overwrite config file if it exists')
    .action(async options => {
      if (!options.forced && existsSync(CONFIG_PATH)) {
        console.warn(`${TIP_ERROR} config file already exists. If you want to overwrite the current file, use ${colors.cyan('kokkoro init -f')}`);
        process.exit(1);
      }

      const response = await prompts.prompt(questions, {
        onCancel: () => {
          console.log(`\n${TIP_INFO} config file generation has been aborted\n`);
          process.exit(1);
        },
      });

      const { uin, master, port, plugins } = response;
      const kokkoro_config = {
        port,
        bots: {
          [uin]: {
            prefix: '>',
            auto_login: true,
            login_mode: 'qrcode',
            master: master.map(Number),
            config: {
              log_level: 'info',
              platform: 1,
              ignore_self: true,
              resend: true,
              data_dir: './data/bots',
              reconn_interval: 5,
              cache_group_member: true,
              auto_server: true,
            }
          }
        }
      };

      try {
        await writeFile(`kokkoro.yml`, dump(kokkoro_config));
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
      } catch (err) {
        //         console.warn(`\n${error} ${err}`);
        //         process.exit(0);
      }
    })
}