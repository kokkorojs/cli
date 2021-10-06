#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ora_1 = __importDefault(require("ora"));
const cac_1 = __importDefault(require("cac"));
const util_1 = require("util");
const path_1 = require("path");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const prompts_1 = __importDefault(require("prompts"));
const util_2 = require("./util");
const help_1 = require("./help");
const { cyan } = util_2.colors;
const { error, info, success, warn } = util_2.tips;
const config_path = (0, path_1.resolve)(util_2.cwd, 'kkrconfig.json');
const cli = (0, cac_1.default)('kokkoro').help().version(help_1.KOKKORO_VERSION);
const questions = [
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
            { title: 'kokkoro-plugin-setu', value: 'kokkoro-plugin-setu', description: 'hso，我都不看这些的' },
            { title: 'kokkoro-plugin-gobang', value: 'kokkoro-plugin-gobang', disabled: true },
            { title: 'kokkoro-plugin-hitokoto', value: 'kokkoro-plugin-hitokoto', disabled: true }
        ],
        warn: '- 近期重构中，当前插件暂时不可用',
    }
];
(function init(cli) {
    cli
        .command('init', 'initialize kokkoro config file')
        .option('-f, --forced', 'overwrite config file if it exists')
        .action(async (options) => {
        if (!options.forced && (0, fs_1.existsSync)(config_path)) {
            console.warn(`${error} config file already exists. If you want to overwrite the current file, use ${cyan('kokkoro init -f')}`);
            process.exit(1);
        }
        const response = await prompts_1.default.prompt(questions, {
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
        (0, promises_1.writeFile)(`kkrconfig.json`, `${JSON.stringify(config, null, 2)}`)
            .then(async () => {
            console.log(`\n${success} created config file ${cyan(`'${config_path}'`)}`);
            const all_plugin = ['kokkoro', ...plugins];
            const plugin_length = all_plugin.length;
            for (let i = 0; i < plugin_length; i++) {
                const plugin = all_plugin[i];
                const spinner = (0, ora_1.default)(`Install ${plugin}`).start();
                const promiseExec = (0, util_1.promisify)(child_process_1.exec);
                try {
                    await promiseExec(`npm i -D ${plugin}`);
                    spinner.succeed();
                    i === plugin_length - 1 && console.log(`\n${success} project is initialized successfully`);
                }
                catch (error) {
                    spinner.fail();
                    i === plugin_length - 1 && console.warn(`\n${warn} npm package was not installed successfully`);
                }
            }
        })
            .catch((err) => {
            console.warn(`\n${error} ${err.message}`);
            process.exit(0);
        });
    });
})(cli);
(function start(cli) {
    cli
        .command('start', 'kokkoro bot link start')
        .action(async () => {
        if (!(0, fs_1.existsSync)(config_path)) {
            console.warn(`${error} config file is not exists. If you want to create the file, use ${cyan('kokkoro init')}\n`);
            process.exit(1);
        }
        // Acsii Font Name: Mini: http://patorjk.com/software/taag/
        const wellcome = `-------------------------------------------------------------------------------------

        \\    / _  | |  _  _  ._ _   _    _|_  _    |   _  |  |   _  ._ _  
         \\/\\/ (/_ | | (_ (_) | | | (/_    |_ (_)   |< (_) |< |< (_) | (_)

-------------------------------------------------------------------------------------`;
        console.log(cyan(wellcome));
        util_2.logger.level = 'all';
        util_2.logger.mark(`----------`);
        util_2.logger.mark(`Package Version: kokkoro@${help_1.KOKKORO_VERSION} (Released on ${help_1.KOKKORO_UPDAY})`);
        util_2.logger.mark(`View Changelogs：https://github.com/dcyuki/kokkoro/releases`);
        util_2.logger.mark(`----------`);
        util_2.logger.mark(`项目启动完成，开始登录账号`);
        require('./startup');
    });
})(cli);
cli.parse();
!cli.matchedCommand && cli.outputHelp();
