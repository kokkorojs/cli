#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ora_1 = __importDefault(require("ora"));
const cac_1 = __importDefault(require("cac"));
const path_1 = require("path");
const fs_1 = require("fs");
const util_1 = require("util");
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const prompts_1 = require("prompts");
const util_2 = require("./util");
const help_1 = __importDefault(require("./help"));
const util = __importStar(require("./util"));
const questions = [
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
function init(cli) {
    cli
        .command('init', 'initialize kokkoro config file')
        .option('-f, --forced', 'overwrite config file if it exists')
        .action(async (options) => {
        const path = path_1.resolve(util_2.cwd, 'kokkoro.config.js');
        if (!options.forced && fs_1.existsSync(path)) {
            console.warn(`${util_2.error} config file already exists. If you want to overwrite the current file, use ${util_2.cyan('kokkoro init -f')}`);
            process.exit(1);
        }
        const response = await prompts_1.prompt(questions, {
            onCancel: () => {
                console.log(`\n${util_2.info} config file generation has been aborted\n`);
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
        promises_1.writeFile(`kokkoro.config.js`, `module.exports = ${JSON.stringify(config, null, 2).replace(/"([^"]+)":/g, '$1:')}`)
            .then(async () => {
            console.log(`\n${util_2.success} created config file ${util_2.cyan(`'${path}'`)}`);
            const all_plugin = ['kokkoro', ...plugins];
            const plugin_length = all_plugin.length;
            for (let i = 0; i < plugin_length; i++) {
                const plugin = all_plugin[i];
                const spinner = ora_1.default(`Install ${plugin}`).start();
                const promiseExec = util_1.promisify(child_process_1.exec);
                try {
                    await promiseExec(`npm i -D ${plugin}`);
                    spinner.succeed();
                    i === plugin_length - 1 && console.log(`\n${util_2.success} project is initialized successfully`);
                }
                catch (error) {
                    spinner.fail();
                    i === plugin_length - 1 && console.warn(`\n${util_2.warn} npm package was not installed successfully`);
                }
            }
        })
            .catch((err) => {
            console.warn(`\n${util_2.error} ${err.message}`);
            process.exit(0);
        });
    });
}
function start(cli) {
    cli
        .command('start', 'kokkoro bot link start')
        .action(() => {
        const path = path_1.resolve(util_2.cwd, 'kokkoro.config.js');
        if (!fs_1.existsSync(path)) {
            console.warn(`${util_2.error} config file is not exists. If you want to create the file, use ${util_2.cyan('kokkoro init')}\n`);
            process.exit(1);
        }
        // Acsii Font Name: Mini: http://patorjk.com/software/taag/
        const wellcome = `-------------------------------------------------------------------------------------

          \\    / _  | |  _  _  ._ _   _    _|_  _    |   _  |  |   _  ._ _  
           \\/\\/ (/_ | | (_ (_) | | | (/_    |_ (_)   |< (_) |< |< (_) | (_)

-------------------------------------------------------------------------------------`;
        console.log('\x1B[36m%s\x1B[0m', wellcome);
        util.logger.level = 'all';
        util.logger.mark(`----------`);
        util.logger.mark(`Package Version: kokkoro@${help_1.default.KOKKORO_VERSION} (Released on 2021/8/15)`);
        util.logger.mark(`View Changelogs：https://github.com/dcyuki/kokkoro/releases`);
        util.logger.mark(`----------`);
        util.logger.mark(`项目启动完成，开始登录账号`);
        require('./startup');
    });
}
const cli = cac_1.default('kokkoro').help().version(help_1.default.KOKKORO_VERSION);
init(cli);
start(cli);
cli.parse();
!cli.matchedCommand && cli.outputHelp();
