#! /usr/bin/env node

const prompts = require("prompts");
const { spawn } = require("child_process");

let options = [
    { title: "Feature Branch", value: 'feat' },
    { title: "Fix Branch", value: 'fix' },
    { title: "Others", value: 'others' },
];

let promptsConfig = [{
    type: 'select',
    name: 'value',
    message: 'Pick an option',
    choices: options,
    initial: 0
}];

let branchNameQuestion = [{
    type: 'text',
    name: 'value',
    message: `Please enter branch name`
}];

async function createBranch() {
    const response = await prompts(promptsConfig);
    let choice = response.value;
    if (!choice) {
        console.error("Please try again!");
        return;
    }

    const repsoneForBranchName = await prompts(branchNameQuestion);
    let branchName = repsoneForBranchName.value;
    if (!branchName) {
        console.error("Please try again!");
        return;
    }
    executeFunction(choice, branchName);
}

function executeFunction(choice, branchName) {
    if (choice == 'fix' || choice == 'feat') {
        var ls = spawn('git', ['checkout', '-b', `${choice}/${branchName}`]);
    } else {
        var ls = spawn('git', ['checkout', '-b', `${branchName}`]);
    }

    ls.stdout.on("data", function (data) {
        console.log(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        if (choice == 'fix' || choice == 'feat') {
            console.log(`Created branch: ${choice}/${branchName}`);
        } else {
            console.log(`Created branch: ${branchName}`);
        }
    });
}

module.exports.createBranch = createBranch;