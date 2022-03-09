import { CAC } from 'cac';
import { join } from 'path';
import { promisify } from 'util';
import { exit } from 'process';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { writeFile, mkdir, readFile } from 'fs/promises';
import prompts, { PromptObject } from 'prompts';

import { colors, config_path, plugins_path, TIP_ERROR, TIP_INFO } from '.';

const promiseExec = promisify(exec);
const questions: PromptObject[] = [
  {
    type: 'confirm',
    name: 'init',
    message: 'Would you like to initialize npm package?',
    initial: false,
  },
  {
    type: 'select',
    name: 'language',
    message: 'Which script langage would you like to use',
    choices: [
      { title: 'Typescript', value: 'ts', description: 'yes yes yes' },
      { title: 'Javascript', value: 'js', description: 'no no no' },
    ],
  },
];
const onCancel = () => {
  console.log(`${TIP_INFO} plugin module creation has been aborted\n`);
  exit(0);
}
const ts_template = `import { AllMessageEvent, Extension, Bot } from 'kokkoro-core';

export default class implements Extension {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  onMessage(event: AllMessageEvent) {
    const raw_message = event.raw_message;

    raw_message === '你好' && event.reply('hello world');
  }
}`;
const js_template = `module.exports = class {
  constructor(bot) {
    this.bot = bot;
  }

  onMessage(event) {
    const raw_message = event.raw_message;

    raw_message === '你好' && event.reply('hello world');
  }
}`;

export default function (cli: CAC) {
  cli
    .command('create <name>', 'create a kokkoro plugin project')
    .action(async name => {
      if (!existsSync(config_path)) {
        console.error(`${TIP_ERROR} config file is not exists. If you want to create the file, use ${colors.cyan('kokkoro init')}\n`);
        exit(1);
      }

      try {
        if (!existsSync(plugins_path)) {
          await mkdir(plugins_path);
        }

        const response = await prompts(questions, { onCancel });
        const { init, language } = response;
        const module_path = join(plugins_path, name);

        if (existsSync(module_path)) {
          console.warn(`${TIP_ERROR} plugin directory already exists\n`);
          exit(1);
        }

        await mkdir(module_path);

        switch (language) {
          case 'ts':
            const src_path = join(module_path, 'src');
            const tsconfig_path = join(__dirname, '../tsconfig.json');
            const tsconfig = await readFile(tsconfig_path, 'utf8');

            await mkdir(src_path);
            await writeFile(join(src_path, 'index.ts'), ts_template);
            await writeFile(join(src_path, 'tsconfig.json'), tsconfig);
            break;
          case 'js':
            await writeFile(join(module_path, 'index.js'), js_template);
            break;
        }

        if (init) {
          const command = `cd ./plugins/${name} && npm init -y`;
          await promiseExec(command);
        }

        console.log(`${TIP_INFO} plugin module create successful\n`)
      } catch (error) {
        const { message } = error as Error;
        console.warn(`\n${TIP_ERROR} ${message}`);
        exit(1);
      }
    })
}