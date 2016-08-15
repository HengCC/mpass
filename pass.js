#! /usr/bin/env node

/**
 * @author heng
 * @type {Command}
 */

var program = require('commander');
var inquirer = require('inquirer')
var fs = require('fs');


var globalConfig = {
    header: 'heng.pass',
    notnull: '\033[1;31m不能输入空值,请重新输入!\033[0m',
    back: "#",
    current_path: '',
    current_pass: '',
    validate: val=> {
        if (!val) {
            return this.notnull;
        }
        return true;
    }

};


/**
 * 当前加载文件中的账号信息
 * @type {{}}
 */
var global_pass = {};

program.description("\033[34m该程序用来加密解密文件,根据自己设定的key进行加密解密\033[0m");

//load 文件
program
    .command("load")
    .version('v1')
    .description("\033[34m加载一个文件,不存在就会创建新的文件\033[0m")
    .option('-f,--file [name]', '\033[34m待加载文件路径\033[0m', val=>val)
    .action(options=> {
        fs.exists(options.file, exists=> {
            if (exists) {
                globalConfig.current_path = options.file;
                // load file
                tipsPassword(pass=> {
                    globalConfig.current_pass = pass;
                    loadFile(options.file, pass);
                })
            } else {
                // do prompt
                console.log("\033[1;34m文件不存在,开始创建这个文件.\033[0m")
                tipsPassword(pass=> {
                    globalConfig.current_pass = pass;
                    fs.writeFile(options.file, encryption(globalConfig.header + "{}", pass), {
                        flag: "w"
                    }, err=> {
                        if (err) {
                            console.log("\033[1;34m初始化文件失败\033[0m");
                            return;
                        } else {
                            globalConfig.current_path = options.file;
                            console.log("\033[1;34m初始化文件成功,重新加载该文件\033[0m");
                            loadFile(options.file, pass);
                        }
                    });
                }, true)
            }
        })
    });


/**
 * 提示输入密码
 * @param callback
 * @param create
 */
function tipsPassword(callback, create = false) {
    //如果是新创建的文件,则提示输入加密密码,并且需要2次验证
    var options = [
        {
            type: "password",
            name: "pass1",
            message: "\033[1;35m请输入您的密码!\033[0m",
            validate: globalConfig.validate
        }
    ]
    if (create) {
        tips(options).then(answer1=> {
            var options2 = [
                {
                    type: "password",
                    name: "pass2",
                    message: "\033[1;35m请再次输入您的密码!\033[0m",
                    validate: globalConfig.validate
                }
            ]
            tips(options2).then(answer2=> {
                if (answer1.pass1 == answer2.pass2) {
                    callback(answer2.pass2)
                } else {
                    console.log("\033[1;31m两次密码不匹配.请重新输入!\033[0m")
                    tipsPassword(callback, create);
                }
            })
        })
    } else {
        tips(options).then(answer=> {
            callback(answer.pass1)
        })
    }
}

/**
 * 加载文件后的操作
 */
function afterLoadOperation() {
    var options = [
        {
            type: 'list',
            name: 'select',
            message: '\033[1;35m请选择你要执行的动作\033[0m',
            choices: [
                {
                    name: '\033[4;36m查询所有账户信息\033[0m',
                    value: 'selectAll'
                },
                {
                    name: '\033[4;36m过滤账号信息\033[0m',
                    value: 'filterAccount'
                },
                // new inquirer.Separator(),
                {
                    name: '\033[4;36m增加一个账户信息\033[0m',
                    value: 'addAccount'
                },
                {
                    name: '\033[4;36m删除一个账户信息\033[0m',
                    value: 'deleteAccount'
                },
                //  new inquirer.Separator(),
                {
                    name: '\033[4;36m修改密钥\033[0m',
                    value: 'rePass'

                },
                {
                    name: '\033[4;36m持久化当前配置\033[0m',
                    value: 'persistCurrent'
                },
                {
                    name: '\033[4;36m退出本程序\033[0m',
                    value: 'exit'
                }
            ]

        }
    ];

    tips(options).then(answer=> {
        var select = answer.select;

        switch (select) {
            case "selectAll":
                return selectAll();
                break;
            case "filterAccount":
                return filterAccount();
                break;
            case "addAccount":
                return addAccount();
                break;
            case "deleteAccount":
                return deleteAccount();
                break;
            case "persistCurrent":
                return persistCurrent();
                break;
            case "rePass":
                return rePass();
                break;
            case "exit":
                return;
            default:
                return afterLoadOperation();
        }

    });
}

/**
 * 查询所有账户信息
 */
function selectAll() {
    var i = 0;

    for (var key in global_pass) {
        console.log("   \033[1;32m", key, ":", global_pass[key], "\033[0m");
        i++;
    }

    if (i == 0) {
        console.log("\033[1;31m没有任何账号信息,请选择添加账号\033[0m")
    }
    return afterLoadOperation();
}

/**
 * 过滤账户信息
 */
function filterAccount() {
    tips([
        {
            type: 'input',
            name: 'search',
            message: '\033[1;35m请输入要过滤的账号,返回上一层请输入' + globalConfig.back + ':\033[0m',
            validate: globalConfig.validate
        }
    ]).then(answer=> {
        if (answer.search == globalConfig.back) {
            return afterLoadOperation();
        }

        var i = 0;
        for (var key in global_pass) {
            if (key.indexOf(answer.search) != -1 || global_pass[key].indexOf(answer.search) != -1) {
                console.log("   \033[1;32m", key, ":", global_pass[key], "\033[0m");
                i++;
            }
        }
        if (i == 0) {
            console.log("\033[1;31m没有查询到任何相关账号信息,请重新输入查询词\033[0m")
        }

        return filterAccount();
    })
}

/**
 * 增加账号信息
 */
function addAccount() {
    var options = [
        {
            type: "input",
            name: "descAccount",
            message: "\033[1;35m请输入账号的别名(唯一),比如:电脑登录账号\033[0m",
            validate: globalConfig.validate
        }
    ];

    tips(options).then(answer=> {
        var options2 = [
            {
                type: "input",
                name: "account",
                message: "\033[1;35m请输入账号名\033[0m",
                validate: globalConfig.validate
            }
        ];

        tips(options2).then(answer2=> {
            tipsPassword(pass=> {
                global_pass[answer.descAccount] = answer2.account + " / " + pass;
                tips([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: '\033[1;35m创建成功,继续创建账号吗?\033[0m'
                    }
                ]).then(c=> {
                    if (c.confirm) {
                        return addAccount();
                    } else {
                        return afterLoadOperation();
                    }
                });


            }, true);
        })
    })
}

/**
 * 删除账号信息
 */
function deleteAccount() {
    var options = [
        {
            type: "input",
            name: "descAccount",
            message: "\033[1;35m请输入要删除的账号别名,输入" + globalConfig.back + "返回上一层\033[0m",
            validate: globalConfig.validate
        }
    ];

    tips(options).then(answer=> {
        if (answer.descAccount == globalConfig.back) {
            return afterLoadOperation();
        } else {
            if (global_pass[answer.descAccount]) {
                delete global_pass[answer.descAccount];
                console.log("\033[1;31m删除成功\033[0m");
                return afterLoadOperation();
            } else {
                console.log("\033[1;31m您要删除的账号不存在,请查询或者重新输入\033[0m");
                return deleteAccount();
            }
        }
    });
}

/**
 * 持久化配置至文件中
 */
function persistCurrent() {
    tips([
        {
            type: 'list',
            name: 'choice',
            message: "\033[1;35m请选择保存方式:\033[0m",
            choices: [
                {
                    name: '\033[4;33m覆盖原文件\033[0m',
                    value: 'override'
                },
                {
                    name: '\033[4;33m保存至另外的文件\033[0m',
                    value: 'saveOther'
                }
            ]
        }
    ]).then(answer=> {
        if (answer.choice == 'override') {
            return saveAccount(globalConfig.current_path);
        } else {
            tips([
                {
                    type: 'input',
                    name: 'otherPath',
                    message: "\033[1;35m请输入保存路径及文件名(注意会覆盖掉这个文件):\033[0m",
                    validate: globalConfig.validate
                }
            ]).then(answer2=> {
                return saveAccount(answer2.otherPath);
            })
        }
    })
}

function rePass() {
    tips([
        {
            type: 'password',
            name: 'rePass',
            message: '\033[1;35m请输入旧的密钥:\033[0m',
            validate: globalConfig.validate
        }
    ]).then(answer=> {
        if (answer.rePass == globalConfig.back) {
            return afterLoadOperation();
        }

        if (answer.rePass != globalConfig.current_pass) {
            console.log("\033[1;31m密钥不匹配,请重新输入,返回上层,请输入:" + globalConfig.back + "\033[0m")
            return rePass();
        } else {
            tipsPassword(pass=> {
                saveAccount(globalConfig.current_path, pass,()=>{
                    globalConfig.current_pass = pass;
                    return loadFile(globalConfig.current_path, pass);
                });
            }, true);
        }
    })
}


/**
 * 持久化配置
 * @param path
 */
function saveAccount(path, pass = "", callback) {
    if (pass == "") {
        pass = globalConfig.current_pass;
    }
    try {
        fs.writeFile(path, encryption(globalConfig.header + JSON.stringify(global_pass), pass), {
            flag: "w+"
        }, err=> {
            if (err) {
                console.log("\033[1;31m写入文件失败,错误原因:", err, "请尝试重新写入或者保存至其他文件中\033[0m");
                return afterLoadOperation();
            } else {
                if (null != callback && typeof callback == 'function') {
                    callback();
                } else {
                    console.log("\033[1;34m写入配置成功,请选择其他操作:\033[0m");
                    return afterLoadOperation();
                }
            }
        });
    } catch (e) {
        console.log(e);
    }
}

/**
 * 加载文件
 * @param path
 * @param pass
 */
function loadFile(path, pass) {
    fs.readFile(path, 'UTF-8', (err, buffer)=> {
        var string = decryption(buffer.toString(), pass);
        if (!string.startsWith(globalConfig.header)) {
            console.log("\033[1;31m密钥错误,或者非本程序加密的文件!\033[0m");
            return;
        } else {
            string = string.substr(globalConfig.header.length, string.length - globalConfig.header.length)
            global_pass = JSON.parse(string);
            console.log("\033[1;34m数据加载成功,请选择您要执行的操作\033[0m");
            afterLoadOperation();
        }
    })
}

/**
 * 交互方法
 * @param options
 * @returns {*}
 */
function tips(options) {
    return inquirer.prompt(options);
}

/**
 * 获取一个字符串的长度
 * @param string
 * @returns {number}
 */
function getStringLength(string) {
    var i = 0;
    for (let codePoint of string) {
        i++;
    }
    return i;
}

/**
 * 加密函数
 * @param string 待加密的字符串
 * @param key 加密密钥
 */
function encryption(string, key) {
    key = signMd5(key);
    var key_length = getStringLength(key);
    var i = 0;
    var newString = "";
    for (let code of string) {
        code = code.codePointAt(0) + key.codePointAt(i);
        newString += String.fromCodePoint(code);
        if (i == key_length - 1) {
            i = 0;
        } else {
            i++;
        }
    }
    return newString;
}

/**
 * 解密函数
 * @param string 待解密的字符串
 * @param key 解密密钥
 */
function decryption(string, key) {
    key = signMd5(key);
    var key_length = getStringLength(key);
    var i = 0;
    var newString = "";
    try {
        for (let code of string) {
            code = code.codePointAt(0) - key.codePointAt(i);
            newString += String.fromCodePoint(code);
            if (i == key_length - 1) {
                i = 0;
            } else {
                i++;
            }
        }
    } catch (e) {
        return '';
    }
    return newString;
}

/**
 * MD5签名
 * @param string
 * @returns {*}
 */
function signMd5(string) {
    var crypto = require('crypto');
    return crypto.createHash('md5').update(string, "UTF-8").digest("hex");

}

program.parse(process.argv);
