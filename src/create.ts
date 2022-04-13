import { join } from 'path';
import { exit } from 'process';
import { existsSync } from 'fs';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { promisify } from 'util';
import { Command } from 'commander';
import { exec } from 'child_process';
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
      { title: 'Typescript', value: 'ts' },
      { title: 'Javascript', value: 'js' },
    ],
  },
];
const onCancel = () => {
  console.log(`${TIP_INFO} plugin module creation has been aborted\n`);
  exit(0);
}


function getTemplate(name: string, langage: 'ts' | 'js') {
  const ts_template = `import { Plugin, Option } from 'kokkoro';

const option: Option = {
  apply: true,
  lock: false,
};
export const plugin = new Plugin('${name}', option);

plugin
  .command('test')
  .description('示例插件测试')
  .sugar(/^(测试)$/)
  .action(function () {
    this.event.reply('this is a test...');
  })
`;
  const js_template = `const { Plugin } = require('kokkoro');
  
const option = {
  apply: true,
  lock: false,
};
const plugin = new Plugin('${name}', option);

plugin
  .command('test')
  .description('示例插件测试')
  .sugar(/^(测试)$/)
  .action(function () {
    this.event.reply('this is a test...');
  })

module.exports = {
  plugin,
};
`;
  return langage === 'ts' ? ts_template : js_template;
}

export default function (program: Command) {
  program
    .command('create <name>')
    .description('create a kokkoro plugin project')
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
        const template = getTemplate(name, language);

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
            await writeFile(join(src_path, 'index.ts'), template);
            await writeFile(join(src_path, 'tsconfig.json'), tsconfig);
            break;
          case 'js':
            await writeFile(join(module_path, 'index.js'), template);
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
